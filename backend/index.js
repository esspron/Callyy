const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const OpenAI = require('openai');
const cheerio = require('cheerio');
const xml2js = require('xml2js');

// Only load .env file in development (Railway injects env vars directly)
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

// ============================================
// REDIS CACHE INITIALIZATION (Upstash - HTTP-based)
// Uses @upstash/redis for serverless-friendly HTTP connections
// Docs: https://upstash.com/docs/redis/sdks/ts/overview
// ============================================
let redis = null;
const CACHE_TTL = {
    ASSISTANT: 300,      // 5 minutes
    PHONE_CONFIG: 600,   // 10 minutes  
    WHATSAPP_CONFIG: 300, // 5 minutes
    CUSTOMER: 180,       // 3 minutes
    MESSAGE_DEDUP: 3600  // 1 hour for deduplication
};

// Initialize Upstash Redis (HTTP-based - recommended for production)
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const { Redis } = require('@upstash/redis');
    redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    console.log('✅ Upstash Redis initialized (HTTP mode - Mumbai)');
} else if (process.env.REDIS_URL) {
    // Fallback to ioredis for TCP connection (legacy support)
    const IoRedis = require('ioredis');
    // Upstash requires TLS - URL should start with rediss://
    let redisUrl = process.env.REDIS_URL;
    if (redisUrl.startsWith('redis://') && !redisUrl.includes('localhost')) {
        redisUrl = redisUrl.replace('redis://', 'rediss://');
        console.log('⚠️ Upgraded to TLS connection (rediss://)');
    }
    
    redis = new IoRedis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 100, 3000),
        connectTimeout: 5000,
        commandTimeout: 1000,
        tls: redisUrl.startsWith('rediss://') ? {} : undefined,
        lazyConnect: true
    });
    
    redis.on('connect', () => console.log('✅ Redis connected via TCP (Mumbai)'));
    redis.on('error', (err) => console.error('Redis TCP error:', err.message));
    
    redis.connect().catch(err => {
        console.warn('⚠️ Redis TCP connection failed:', err.message);
        redis = null;
    });
    
    // Mark as ioredis instance for different API handling
    redis._isIoRedis = true;
} else {
    console.warn('⚠️ No Redis configured - running without cache (slower)');
    console.warn('   Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for caching');
}

// ============================================
// CACHE HELPER FUNCTIONS (Works with both SDKs)
// ============================================

async function cacheGet(key) {
    if (!redis) return null;
    try {
        const data = await redis.get(key);
        if (!data) return null;
        // Upstash HTTP SDK auto-parses JSON, ioredis doesn't
        return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (err) {
        console.error('Cache get error:', err.message);
        return null;
    }
}

async function cacheSet(key, value, ttl = 300) {
    if (!redis) return;
    try {
        const stringValue = JSON.stringify(value);
        if (redis._isIoRedis) {
            await redis.setex(key, ttl, stringValue);
        } else {
            // Upstash HTTP SDK uses { ex: seconds } option
            await redis.set(key, stringValue, { ex: ttl });
        }
    } catch (err) {
        console.error('Cache set error:', err.message);
    }
}

async function cacheDelete(key) {
    if (!redis) return;
    try {
        await redis.del(key);
    } catch (err) {
        console.error('Cache delete error:', err.message);
    }
}

// Check if message was already processed (deduplication)
async function isMessageProcessed(messageId) {
    if (!redis) return false;
    try {
        const exists = await redis.exists(`msg:${messageId}`);
        return exists === 1 || exists === true;
    } catch (err) {
        return false;
    }
}

// Mark message as processed
async function markMessageProcessed(messageId) {
    if (!redis) return;
    try {
        if (redis._isIoRedis) {
            await redis.setex(`msg:${messageId}`, CACHE_TTL.MESSAGE_DEDUP, '1');
        } else {
            await redis.set(`msg:${messageId}`, '1', { ex: CACHE_TTL.MESSAGE_DEDUP });
        }
    } catch (err) {
        console.error('Cache mark message error:', err.message);
    }
}

// Initialize OpenAI client (will be null if API key not set)
let openai = null;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });
    console.log('✅ OpenAI client initialized');
} else {
    console.warn('⚠️ OPENAI_API_KEY not set - AI features will be disabled');
}

const app = express();
const port = process.env.PORT || 3001;

// CORS configuration for production
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://voicory.vercel.app',
        'https://voicory.com',
        /\.vercel\.app$/,
        /\.railway\.app$/
    ],
    credentials: true
}));
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
// Use service role key for backend operations (bypasses RLS)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// CACHED DATABASE LOOKUPS (Low Latency)
// ============================================

// Get assistant with caching
async function getCachedAssistant(assistantId) {
    const cacheKey = `assistant:${assistantId}`;
    
    // Try cache first
    const cached = await cacheGet(cacheKey);
    if (cached) {
        console.log(`[CACHE HIT] Assistant ${assistantId}`);
        return cached;
    }
    
    // Cache miss - fetch from DB
    console.log(`[CACHE MISS] Assistant ${assistantId}`);
    const { data, error } = await supabase
        .from('assistants')
        .select('*')
        .eq('id', assistantId)
        .single();
    
    if (data && !error) {
        await cacheSet(cacheKey, data, CACHE_TTL.ASSISTANT);
    }
    return data;
}

// Get WhatsApp config with caching
async function getCachedWhatsAppConfig(wabaId) {
    const cacheKey = `waba:${wabaId}`;
    
    const cached = await cacheGet(cacheKey);
    if (cached) {
        console.log(`[CACHE HIT] WhatsApp config ${wabaId}`);
        return cached;
    }
    
    console.log(`[CACHE MISS] WhatsApp config ${wabaId}`);
    const { data, error } = await supabase
        .from('whatsapp_configs')
        .select('*')
        .eq('waba_id', wabaId)
        .single();
    
    if (data && !error) {
        await cacheSet(cacheKey, data, CACHE_TTL.WHATSAPP_CONFIG);
    }
    return data;
}

// Get phone number config with caching (for voice calls)
async function getCachedPhoneConfig(phoneNumber) {
    // Normalize phone number
    const normalized = phoneNumber.replace(/[^\d+]/g, '');
    const cacheKey = `phone:${normalized}`;
    
    const cached = await cacheGet(cacheKey);
    if (cached) {
        console.log(`[CACHE HIT] Phone config ${normalized}`);
        return cached;
    }
    
    console.log(`[CACHE MISS] Phone config ${normalized}`);
    const { data, error } = await supabase
        .from('phone_numbers')
        .select('*, assistants(*)')
        .eq('twilio_phone_number', normalized)
        .single();
    
    if (data && !error) {
        await cacheSet(cacheKey, data, CACHE_TTL.PHONE_CONFIG);
    }
    return data;
}

// Invalidate cache when data changes
async function invalidateAssistantCache(assistantId) {
    await cacheDelete(`assistant:${assistantId}`);
    console.log(`[CACHE INVALIDATED] Assistant ${assistantId}`);
}

async function invalidateWhatsAppConfigCache(wabaId) {
    await cacheDelete(`waba:${wabaId}`);
    console.log(`[CACHE INVALIDATED] WhatsApp config ${wabaId}`);
}

// ============================================
// EMBEDDING FUNCTIONS (Token Optimization)
// ============================================

// Generate embedding for text using OpenAI
async function generateEmbedding(text) {
    if (!openai || !text) return null;
    
    try {
        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text.slice(0, 8000) // Max 8K chars
        });
        return response.data[0].embedding;
    } catch (error) {
        console.error('Error generating embedding:', error.message);
        return null;
    }
}

// Store message embedding
async function storeMessageEmbedding(messageId, customerId, userId, content, role) {
    if (!content || content.length < 5) return; // Skip very short messages
    
    const embedding = await generateEmbedding(content);
    if (!embedding) return;
    
    try {
        await supabase
            .from('message_embeddings')
            .insert({
                message_id: messageId,
                customer_id: customerId,
                user_id: userId,
                content: content,
                role: role,
                embedding: embedding
            });
        console.log('Stored embedding for message');
    } catch (error) {
        console.error('Error storing embedding:', error.message);
    }
}

// Search for relevant messages using semantic similarity
async function searchRelevantMessages(customerId, query, limit = 8) {
    const queryEmbedding = await generateEmbedding(query);
    if (!queryEmbedding) return [];
    
    try {
        const { data, error } = await supabase.rpc('search_customer_messages', {
            p_customer_id: customerId,
            p_query_embedding: queryEmbedding,
            p_limit: limit
        });
        
        if (error) {
            console.error('Error searching messages:', error);
            return [];
        }
        
        return data || [];
    } catch (error) {
        console.error('Error in semantic search:', error.message);
        return [];
    }
}

// ============================================
// DYNAMIC VARIABLES TEMPLATE RESOLUTION
// ============================================

/**
 * Resolve {{variable}} placeholders in text using customer data and assistant context
 * Similar to ElevenLabs dynamic variables system
 * 
 * @param {string} text - Text containing {{variable}} placeholders
 * @param {Object} context - Context object with variable values
 * @returns {string} - Text with variables resolved
 */
function resolveTemplateVariables(text, context = {}) {
    if (!text || typeof text !== 'string') return text;
    
    // Build the variables map
    const variables = {};
    
    // System variables (auto-available)
    if (context.enableSystemVariables !== false) {
        const now = new Date();
        const timezone = context.timezone || 'Asia/Kolkata';
        
        try {
            const formatter = new Intl.DateTimeFormat('en-US', { 
                timeZone: timezone, 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            });
            const dateFormatter = new Intl.DateTimeFormat('en-US', { 
                timeZone: timezone,
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            variables.current_time = formatter.format(now);
            variables.current_date = dateFormatter.format(now);
        } catch (e) {
            variables.current_time = now.toLocaleTimeString();
            variables.current_date = now.toLocaleDateString();
        }
        
        // Assistant info
        if (context.assistantName) {
            variables.assistant_name = context.assistantName;
        }
    }
    
    // Customer variables (from customer profile)
    if (context.customer) {
        const c = context.customer;
        variables.customer_name = c.name || '';
        variables.customer_phone = c.phone || c.phone_number || '';
        variables.customer_email = c.email || '';
        
        // Customer custom variables
        if (c.variables && typeof c.variables === 'object') {
            Object.entries(c.variables).forEach(([key, value]) => {
                variables[key] = value;
            });
        }
    }
    
    // Custom variables from assistant definition (with placeholders)
    if (context.customVariables && Array.isArray(context.customVariables)) {
        context.customVariables.forEach(varDef => {
            // Only use placeholder if value not already set
            if (varDef.name && varDef.placeholder && !variables[varDef.name]) {
                variables[varDef.name] = varDef.placeholder;
            }
        });
    }
    
    // Override with any explicitly passed values
    if (context.variables && typeof context.variables === 'object') {
        Object.entries(context.variables).forEach(([key, value]) => {
            variables[key] = value;
        });
    }
    
    // Replace {{variable}} patterns
    const resolved = text.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, (match, varName) => {
        const value = variables[varName.toLowerCase()];
        if (value !== undefined && value !== null && value !== '') {
            return String(value);
        }
        // If variable not found, leave placeholder for debugging
        return `[${varName}]`;
    });
    
    return resolved;
}

// ============================================
// CUSTOMER MEMORY HELPER FUNCTIONS
// ============================================

// Format customer memory context for injection into system prompt
function formatMemoryForPrompt(memoryContext, memoryConfig = {}) {
    if (!memoryContext) return '';
    
    const lines = [];
    lines.push('--- CUSTOMER MEMORY ---');
    
    // Customer basic info
    if (memoryContext.customer) {
        const c = memoryContext.customer;
        lines.push(`Customer: ${c.name || 'Unknown'}`);
        if (c.phone) lines.push(`Phone: ${c.phone}`);
    }
    
    // Memory/relationship overview
    if (memoryContext.memory && memoryConfig.includeSummary !== false) {
        const m = memoryContext.memory;
        lines.push('');
        lines.push('Relationship:');
        if (m.totalConversations) lines.push(`- Total conversations: ${m.totalConversations}`);
        if (m.lastContact) lines.push(`- Last contact: ${new Date(m.lastContact).toLocaleDateString()}`);
        if (m.averageSentiment !== undefined && m.averageSentiment !== null) {
            const sentiment = m.averageSentiment > 0.3 ? 'Positive' : m.averageSentiment < -0.3 ? 'Negative' : 'Neutral';
            lines.push(`- Overall sentiment: ${sentiment}`);
        }
        if (m.engagementScore) lines.push(`- Engagement score: ${m.engagementScore}/100`);
        
        // Personality and preferences
        if (m.personalityTraits && m.personalityTraits.length > 0) {
            lines.push('');
            lines.push(`Personality: ${m.personalityTraits.join(', ')}`);
        }
        
        if (m.interests && m.interests.length > 0) {
            lines.push('');
            lines.push(`Interests: ${m.interests.join(', ')}`);
        }
        
        if (m.painPoints && m.painPoints.length > 0) {
            lines.push('');
            lines.push(`Pain points: ${m.painPoints.join(', ')}`);
        }
        
        // Executive summary
        if (m.executiveSummary) {
            lines.push('');
            lines.push(`Summary: ${m.executiveSummary}`);
        }
    }
    
    // Recent conversations
    if (memoryContext.recentConversations && memoryContext.recentConversations.length > 0 && memoryConfig.rememberConversations !== false) {
        lines.push('');
        lines.push('--- RECENT CONVERSATIONS ---');
        memoryContext.recentConversations.slice(0, 3).forEach((conv, i) => {
            const date = new Date(conv.startedAt).toLocaleDateString();
            const outcome = conv.outcome ? ` (${conv.outcome})` : '';
            lines.push(`[${i + 1}] ${date}${outcome}`);
            if (conv.summary) lines.push(`Summary: ${conv.summary}`);
            if (conv.keyPoints && conv.keyPoints.length > 0) {
                lines.push('Key points:');
                conv.keyPoints.forEach(point => lines.push(`  - ${point}`));
            }
            lines.push('');
        });
    }
    
    // Key insights
    if (memoryContext.keyInsights && memoryContext.keyInsights.length > 0 && memoryConfig.includeInsights !== false) {
        lines.push('--- KEY INSIGHTS ---');
        memoryContext.keyInsights.slice(0, 10).forEach(insight => {
            const type = insight.insightType?.toUpperCase() || 'INFO';
            lines.push(`[${type}] ${insight.content}`);
        });
    }
    
    lines.push('--- END MEMORY ---');
    
    return lines.join('\n');
}

// Analyze conversation and extract insights using AI
async function analyzeConversationWithAI(transcript, assistantName) {
    try {
        const messages = transcript.map(m => `${m.role === 'user' ? 'Customer' : assistantName}: ${m.content}`).join('\n');
        
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini', // Use cheaper model for analysis
            messages: [
                {
                    role: 'system',
                    content: `You are an expert at analyzing customer conversations. Extract insights and customer information from the following conversation.

Return a JSON object with:
{
    "summary": "Brief 1-2 sentence summary of the conversation",
    "keyPoints": ["key point 1", "key point 2"],
    "sentiment": "positive" | "neutral" | "negative",
    "sentimentScore": -1.0 to 1.0,
    "topicsDiscussed": ["topic1", "topic2"],
    "insights": [
        {"type": "preference" | "objection" | "interest" | "pain_point" | "opportunity" | "personal_info", "content": "insight text", "importance": "low" | "medium" | "high"}
    ],
    "actionItems": [{"task": "follow up on X", "priority": "high" | "medium" | "low"}],
    "extractedInfo": {
        "email": "customer's email if mentioned, otherwise null",
        "name": "customer's full name if mentioned differently from profile, otherwise null",
        "address": "address if mentioned, otherwise null",
        "company": "company name if mentioned, otherwise null"
    }
}`
                },
                {
                    role: 'user',
                    content: `Analyze this conversation:\n\n${messages}`
                }
            ],
            temperature: 0.3,
            max_tokens: 1000,
            response_format: { type: 'json_object' }
        });
        
        const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
        return result;
    } catch (error) {
        console.error('Error analyzing conversation:', error);
        return null;
    }
}

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'ok',
        service: 'Voicory Backend',
        timestamp: new Date().toISOString()
    });
});

// Health check for Railway
app.get('/health', async (req, res) => {
    let redisStatus = 'not configured';
    let redisLatency = null;
    let redisMode = null;
    
    if (redis) {
        try {
            const start = Date.now();
            // Both @upstash/redis and ioredis support ping()
            const pong = await redis.ping();
            redisLatency = Date.now() - start;
            redisStatus = 'connected';
            redisMode = redis._isIoRedis ? 'TCP (ioredis)' : 'HTTP (@upstash/redis)';
        } catch (err) {
            redisStatus = 'error: ' + err.message;
        }
    }
    
    res.json({ 
        status: 'healthy',
        redis: {
            status: redisStatus,
            mode: redisMode,
            latency: redisLatency ? `${redisLatency}ms` : null,
            region: 'Mumbai (ap-south-1)'
        },
        uptime: Math.floor(process.uptime()),
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
        }
    });
});

// ============================================
// WEB CRAWLER API ENDPOINTS
// ============================================

/**
 * Discover sitemap and pages from a website URL
 * POST /api/crawler/discover
 * Body: { url: string }
 * Returns: { domain, pages: [{ url, title?, lastmod? }], sitemapFound: boolean }
 */
app.post('/api/crawler/discover', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Parse and validate URL
        let parsedUrl;
        try {
            parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
        } catch {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
        const domain = parsedUrl.host;

        console.log('Discovering pages for:', baseUrl);

        const allPages = new Map(); // Use Map to dedupe by URL
        let sitemapFound = false;

        // Common sitemap locations to try
        const sitemapUrls = [
            `${baseUrl}/sitemap.xml`,
            `${baseUrl}/sitemap_index.xml`,
            `${baseUrl}/sitemap/sitemap.xml`,
            `${baseUrl}/sitemaps/sitemap.xml`,
            `${baseUrl}/wp-sitemap.xml`,
        ];

        // Also check robots.txt for sitemap location
        try {
            const robotsResponse = await axios.get(`${baseUrl}/robots.txt`, {
                timeout: 10000,
                headers: { 'User-Agent': 'Voicory-Crawler/1.0' }
            });

            const sitemapMatches = robotsResponse.data.match(/Sitemap:\s*(.+)/gi);
            if (sitemapMatches) {
                for (const match of sitemapMatches) {
                    const sitemapUrl = match.replace(/Sitemap:\s*/i, '').trim();
                    if (!sitemapUrls.includes(sitemapUrl)) {
                        sitemapUrls.unshift(sitemapUrl); // Prioritize sitemaps from robots.txt
                    }
                }
            }
        } catch (robotsError) {
            console.log('No robots.txt found or error reading it');
        }

        // Try each sitemap URL
        for (const sitemapUrl of sitemapUrls) {
            try {
                console.log('Trying sitemap:', sitemapUrl);
                const sitemapResponse = await axios.get(sitemapUrl, {
                    timeout: 15000,
                    headers: { 
                        'User-Agent': 'Voicory-Crawler/1.0',
                        'Accept': 'application/xml, text/xml, */*'
                    }
                });

                const pages = await parseSitemap(sitemapResponse.data, baseUrl);
                if (pages.length > 0) {
                    sitemapFound = true;
                    for (const page of pages) {
                        if (!allPages.has(page.url)) {
                            allPages.set(page.url, page);
                        }
                    }
                    console.log(`Found ${pages.length} pages in sitemap: ${sitemapUrl}`);
                }
            } catch (sitemapError) {
                console.log(`Sitemap not found at: ${sitemapUrl}`);
            }
        }

        // If no sitemap found, crawl the homepage for links
        if (!sitemapFound || allPages.size === 0) {
            console.log('No sitemap found, crawling homepage for links...');
            try {
                const homepageLinks = await crawlPageForLinks(baseUrl, baseUrl);
                for (const link of homepageLinks) {
                    if (!allPages.has(link.url)) {
                        allPages.set(link.url, link);
                    }
                }
                // Always add the homepage
                if (!allPages.has(baseUrl)) {
                    allPages.set(baseUrl, { url: baseUrl, title: 'Homepage' });
                }
            } catch (crawlError) {
                console.error('Error crawling homepage:', crawlError.message);
            }
        }

        // Convert Map to array and sort
        const pagesArray = Array.from(allPages.values())
            .filter(page => page.url.startsWith(baseUrl)) // Only same-domain URLs
            .sort((a, b) => a.url.localeCompare(b.url))
            .slice(0, 500); // Limit to 500 pages

        console.log(`Discovered ${pagesArray.length} pages for ${domain}`);

        res.json({
            domain,
            baseUrl,
            pages: pagesArray,
            totalPages: pagesArray.length,
            sitemapFound
        });

    } catch (error) {
        console.error('Page discovery error:', error.message);
        res.status(500).json({ error: error.message || 'Failed to discover pages' });
    }
});

/**
 * Parse sitemap XML and return array of page URLs
 */
async function parseSitemap(xmlData, baseUrl) {
    const pages = [];
    
    try {
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(xmlData);

        // Handle sitemap index (contains references to other sitemaps)
        if (result.sitemapindex?.sitemap) {
            const sitemaps = Array.isArray(result.sitemapindex.sitemap) 
                ? result.sitemapindex.sitemap 
                : [result.sitemapindex.sitemap];

            console.log(`Found sitemap index with ${sitemaps.length} sitemaps`);

            // Fetch and parse each sub-sitemap (limit to first 10 to avoid overload)
            for (const sitemap of sitemaps.slice(0, 10)) {
                const sitemapLoc = sitemap.loc;
                if (sitemapLoc) {
                    try {
                        const subResponse = await axios.get(sitemapLoc, {
                            timeout: 10000,
                            headers: { 'User-Agent': 'Voicory-Crawler/1.0' }
                        });
                        const subPages = await parseSitemap(subResponse.data, baseUrl);
                        pages.push(...subPages);
                    } catch (subError) {
                        console.log('Error fetching sub-sitemap:', sitemapLoc);
                    }
                }
            }
        }

        // Handle regular sitemap (contains URLs)
        if (result.urlset?.url) {
            const urls = Array.isArray(result.urlset.url) 
                ? result.urlset.url 
                : [result.urlset.url];

            for (const urlEntry of urls) {
                const url = urlEntry.loc;
                if (url) {
                    pages.push({
                        url: url,
                        lastmod: urlEntry.lastmod || null,
                        priority: urlEntry.priority || null,
                        changefreq: urlEntry.changefreq || null
                    });
                }
            }
        }
    } catch (parseError) {
        console.error('XML parse error:', parseError.message);
    }

    return pages;
}

/**
 * Crawl a page and extract internal links
 */
async function crawlPageForLinks(pageUrl, baseUrl) {
    const links = [];

    try {
        const response = await axios.get(pageUrl, {
            timeout: 15000,
            headers: { 
                'User-Agent': 'Voicory-Crawler/1.0',
                'Accept': 'text/html,application/xhtml+xml'
            },
            maxRedirects: 5
        });

        const $ = cheerio.load(response.data);

        // Extract all links
        $('a[href]').each((i, el) => {
            const href = $(el).attr('href');
            const title = $(el).text().trim() || $(el).attr('title');

            if (href) {
                try {
                    let absoluteUrl;
                    if (href.startsWith('http')) {
                        absoluteUrl = href;
                    } else if (href.startsWith('/')) {
                        absoluteUrl = new URL(href, baseUrl).href;
                    } else if (!href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('javascript:')) {
                        absoluteUrl = new URL(href, pageUrl).href;
                    }

                    if (absoluteUrl && absoluteUrl.startsWith(baseUrl)) {
                        // Remove hash and query params for deduplication
                        const cleanUrl = absoluteUrl.split('#')[0].split('?')[0];
                        // Skip common non-content URLs
                        if (!cleanUrl.match(/\.(jpg|jpeg|png|gif|svg|css|js|pdf|zip|mp4|mp3|ico)$/i)) {
                            links.push({
                                url: cleanUrl,
                                title: title?.substring(0, 100) || null
                            });
                        }
                    }
                } catch (urlError) {
                    // Invalid URL, skip
                }
            }
        });
    } catch (crawlError) {
        console.error('Error crawling page for links:', crawlError.message);
    }

    // Dedupe by URL
    const seen = new Set();
    return links.filter(link => {
        if (seen.has(link.url)) return false;
        seen.add(link.url);
        return true;
    });
}

/**
 * Crawl selected pages and extract content
 * POST /api/crawler/crawl
 * Body: { pages: [{ url }], knowledgeBaseId, documentName, userId }
 * Returns: { success, document, crawledPages }
 */
app.post('/api/crawler/crawl', async (req, res) => {
    try {
        const { pages, knowledgeBaseId, documentName, userId, autoAddFuture } = req.body;

        if (!pages || !Array.isArray(pages) || pages.length === 0) {
            return res.status(400).json({ error: 'At least one page URL is required' });
        }

        if (!knowledgeBaseId || !userId) {
            return res.status(400).json({ error: 'knowledgeBaseId and userId are required' });
        }

        console.log(`Starting crawl of ${pages.length} pages for KB: ${knowledgeBaseId}`);

        // Get domain from first URL
        const firstUrl = new URL(pages[0].url || pages[0]);
        const domain = firstUrl.host;
        const baseUrl = `${firstUrl.protocol}//${firstUrl.host}`;

        // Create URL document first (status: processing)
        const { data: urlDocument, error: docError } = await supabase
            .from('knowledge_base_documents')
            .insert({
                knowledge_base_id: knowledgeBaseId,
                type: 'url',
                name: documentName || domain,
                source_url: baseUrl,
                crawl_depth: 0,
                processing_status: 'processing',
                user_id: userId,
                metadata: {
                    autoAddFuture: autoAddFuture || false,
                    totalPages: pages.length,
                    crawledAt: new Date().toISOString()
                }
            })
            .select()
            .single();

        if (docError) {
            console.error('Error creating URL document:', docError);
            return res.status(500).json({ error: 'Failed to create document record' });
        }

        console.log('Created URL document:', urlDocument.id);

        // Crawl each page
        const crawledPages = [];
        let totalCharacters = 0;
        let successCount = 0;
        let failCount = 0;

        for (const pageInfo of pages) {
            const pageUrl = typeof pageInfo === 'string' ? pageInfo : pageInfo.url;
            
            try {
                console.log('Crawling:', pageUrl);
                const pageContent = await crawlPageContent(pageUrl);

                if (pageContent.content) {
                    // Insert crawled page record
                    const { data: crawledPage, error: pageError } = await supabase
                        .from('knowledge_base_crawled_pages')
                        .insert({
                            document_id: urlDocument.id,
                            page_url: pageUrl,
                            page_title: pageContent.title,
                            content: pageContent.content,
                            character_count: pageContent.content.length,
                            crawl_status: 'completed',
                            http_status_code: 200,
                            metadata: {
                                description: pageContent.description,
                                wordCount: pageContent.wordCount,
                                headings: pageContent.headings?.slice(0, 10)
                            },
                            crawled_at: new Date().toISOString(),
                            user_id: userId
                        })
                        .select()
                        .single();

                    if (!pageError && crawledPage) {
                        crawledPages.push(crawledPage);
                        totalCharacters += pageContent.content.length;
                        successCount++;
                    }
                } else {
                    // Record failed crawl
                    await supabase
                        .from('knowledge_base_crawled_pages')
                        .insert({
                            document_id: urlDocument.id,
                            page_url: pageUrl,
                            crawl_status: 'failed',
                            crawl_error: 'No content extracted',
                            crawled_at: new Date().toISOString(),
                            user_id: userId
                        });
                    failCount++;
                }

                // Add small delay between requests to be respectful
                await new Promise(resolve => setTimeout(resolve, 200));

            } catch (crawlError) {
                console.error(`Error crawling ${pageUrl}:`, crawlError.message);
                // Record failed crawl
                await supabase
                    .from('knowledge_base_crawled_pages')
                    .insert({
                        document_id: urlDocument.id,
                        page_url: pageUrl,
                        crawl_status: 'failed',
                        crawl_error: crawlError.message,
                        http_status_code: crawlError.response?.status || null,
                        crawled_at: new Date().toISOString(),
                        user_id: userId
                    });
                failCount++;
            }
        }

        // Update document with final status and stats
        const { data: updatedDoc, error: updateError } = await supabase
            .from('knowledge_base_documents')
            .update({
                processing_status: failCount === pages.length ? 'failed' : 'completed',
                character_count: totalCharacters,
                last_crawled_at: new Date().toISOString(),
                metadata: {
                    ...urlDocument.metadata,
                    successCount,
                    failCount,
                    totalCharacters,
                    crawledPagesCount: successCount
                }
            })
            .eq('id', urlDocument.id)
            .select()
            .single();

        console.log(`Crawl complete: ${successCount} success, ${failCount} failed`);

        res.json({
            success: true,
            document: updatedDoc || urlDocument,
            stats: {
                totalPages: pages.length,
                successCount,
                failCount,
                totalCharacters
            },
            crawledPages: crawledPages.map(p => ({
                id: p.id,
                url: p.page_url,
                title: p.page_title,
                characterCount: p.character_count
            }))
        });

    } catch (error) {
        console.error('Crawl error:', error);
        res.status(500).json({ error: error.message || 'Failed to crawl pages' });
    }
});

/**
 * Crawl a single page and extract content
 */
async function crawlPageContent(url) {
    const response = await axios.get(url, {
        timeout: 30000,
        headers: {
            'User-Agent': 'Voicory-Crawler/1.0 (+https://voicory.com)',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9'
        },
        maxRedirects: 5
    });

    const $ = cheerio.load(response.data);

    // Remove unwanted elements
    $('script, style, noscript, iframe, nav, footer, header, aside, .sidebar, .nav, .menu, .footer, .header, .advertisement, .ads, .social-share, .cookie-notice, .popup, #cookie-banner, .comments, form').remove();

    // Extract title
    const title = $('title').first().text().trim() ||
                  $('h1').first().text().trim() ||
                  $('meta[property="og:title"]').attr('content') ||
                  '';

    // Extract description
    const description = $('meta[name="description"]').attr('content') ||
                       $('meta[property="og:description"]').attr('content') ||
                       '';

    // Extract headings for structure
    const headings = [];
    $('h1, h2, h3').each((i, el) => {
        const text = $(el).text().trim();
        if (text && text.length < 200) {
            headings.push({
                level: el.tagName.toLowerCase(),
                text: text
            });
        }
    });

    // Extract main content
    // Try common content selectors first
    let mainContent = '';
    const contentSelectors = [
        'main',
        'article',
        '[role="main"]',
        '.content',
        '.post-content',
        '.entry-content',
        '.article-content',
        '.page-content',
        '#content',
        '.main-content'
    ];

    for (const selector of contentSelectors) {
        const el = $(selector);
        if (el.length) {
            mainContent = el.text().trim();
            if (mainContent.length > 100) break;
        }
    }

    // Fallback to body
    if (!mainContent || mainContent.length < 100) {
        mainContent = $('body').text().trim();
    }

    // Clean up content
    mainContent = mainContent
        .replace(/\s+/g, ' ')           // Normalize whitespace
        .replace(/\n\s*\n/g, '\n\n')    // Normalize line breaks
        .trim();

    // Count words
    const wordCount = mainContent.split(/\s+/).filter(w => w.length > 0).length;

    return {
        title: title.substring(0, 500),
        description: description.substring(0, 500),
        content: mainContent,
        headings,
        wordCount,
        characterCount: mainContent.length
    };
}

/**
 * Get crawled pages for a document
 * GET /api/crawler/pages/:documentId
 */
app.get('/api/crawler/pages/:documentId', async (req, res) => {
    try {
        const { documentId } = req.params;

        const { data: pages, error } = await supabase
            .from('knowledge_base_crawled_pages')
            .select('*')
            .eq('document_id', documentId)
            .order('crawled_at', { ascending: false });

        if (error) throw error;

        res.json({
            pages: pages || [],
            totalCount: pages?.length || 0
        });

    } catch (error) {
        console.error('Error fetching crawled pages:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Re-crawl a document (refresh content)
 * POST /api/crawler/recrawl/:documentId
 */
app.post('/api/crawler/recrawl/:documentId', async (req, res) => {
    try {
        const { documentId } = req.params;

        // Get the document and its pages
        const { data: document, error: docError } = await supabase
            .from('knowledge_base_documents')
            .select('*, knowledge_base_crawled_pages(*)')
            .eq('id', documentId)
            .single();

        if (docError || !document) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Get existing page URLs
        const existingPages = document.knowledge_base_crawled_pages || [];
        const pageUrls = existingPages.map(p => ({ url: p.page_url }));

        if (pageUrls.length === 0) {
            return res.status(400).json({ error: 'No pages to re-crawl' });
        }

        // Delete old crawled pages
        await supabase
            .from('knowledge_base_crawled_pages')
            .delete()
            .eq('document_id', documentId);

        // Update document status
        await supabase
            .from('knowledge_base_documents')
            .update({ processing_status: 'processing' })
            .eq('id', documentId);

        // Trigger new crawl (using same logic as /api/crawler/crawl)
        // For simplicity, redirect to the crawl endpoint logic
        req.body = {
            pages: pageUrls,
            knowledgeBaseId: document.knowledge_base_id,
            documentName: document.name,
            userId: document.user_id
        };

        // Re-use crawl endpoint handler
        // This is a simplified version - in production, you might want to use a job queue
        const crawlResult = await performCrawl(pageUrls, document.knowledge_base_id, document.name, document.user_id, documentId);
        
        res.json(crawlResult);

    } catch (error) {
        console.error('Re-crawl error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Helper function for re-crawl
async function performCrawl(pages, knowledgeBaseId, documentName, userId, existingDocId = null) {
    const firstUrl = new URL(pages[0].url || pages[0]);
    const baseUrl = `${firstUrl.protocol}//${firstUrl.host}`;

    let urlDocument;
    
    if (existingDocId) {
        // Update existing document
        const { data } = await supabase
            .from('knowledge_base_documents')
            .select()
            .eq('id', existingDocId)
            .single();
        urlDocument = data;
    }

    const crawledPages = [];
    let totalCharacters = 0;
    let successCount = 0;
    let failCount = 0;

    for (const pageInfo of pages) {
        const pageUrl = typeof pageInfo === 'string' ? pageInfo : pageInfo.url;
        
        try {
            const pageContent = await crawlPageContent(pageUrl);

            if (pageContent.content) {
                const { data: crawledPage } = await supabase
                    .from('knowledge_base_crawled_pages')
                    .insert({
                        document_id: existingDocId || urlDocument.id,
                        page_url: pageUrl,
                        page_title: pageContent.title,
                        content: pageContent.content,
                        character_count: pageContent.content.length,
                        crawl_status: 'completed',
                        http_status_code: 200,
                        metadata: {
                            description: pageContent.description,
                            wordCount: pageContent.wordCount
                        },
                        crawled_at: new Date().toISOString(),
                        user_id: userId
                    })
                    .select()
                    .single();

                if (crawledPage) {
                    crawledPages.push(crawledPage);
                    totalCharacters += pageContent.content.length;
                    successCount++;
                }
            } else {
                failCount++;
            }

            await new Promise(resolve => setTimeout(resolve, 200));

        } catch (crawlError) {
            failCount++;
        }
    }

    // Update document
    await supabase
        .from('knowledge_base_documents')
        .update({
            processing_status: failCount === pages.length ? 'failed' : 'completed',
            character_count: totalCharacters,
            last_crawled_at: new Date().toISOString()
        })
        .eq('id', existingDocId || urlDocument.id);

    return {
        success: true,
        stats: { totalPages: pages.length, successCount, failCount, totalCharacters },
        crawledPages
    };
}

// ============================================
// TWILIO PHONE NUMBER IMPORT
// ============================================

/**
 * Import a Twilio phone number directly (ElevenLabs-style)
 * Validates credentials and phone number, then configures webhook
 * POST /api/twilio/import-direct
 * Body: { accountSid, authToken, phoneNumber, label, userId, smsEnabled }
 */
app.post('/api/twilio/import-direct', async (req, res) => {
    try {
        const { accountSid, authToken, phoneNumber, label, userId, smsEnabled } = req.body;

        if (!accountSid || !authToken || !phoneNumber || !userId) {
            return res.status(400).json({ 
                error: 'Account SID, Auth Token, Phone Number, and User ID are required' 
            });
        }

        // Validate Twilio credentials format
        if (!accountSid.startsWith('AC') || accountSid.length !== 34) {
            return res.status(400).json({ 
                error: 'Invalid Account SID format. It should start with "AC" and be 34 characters long.' 
            });
        }

        // Normalize phone number to E.164 format
        let normalizedNumber = phoneNumber.replace(/[^\d+]/g, '');
        if (!normalizedNumber.startsWith('+')) {
            normalizedNumber = '+' + normalizedNumber;
        }

        console.log('Importing Twilio number directly:', normalizedNumber, 'for user:', userId);

        // First, find the phone number in Twilio to get its SID
        const searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`;
        
        const searchResponse = await axios.get(searchUrl, {
            auth: {
                username: accountSid,
                password: authToken
            },
            params: {
                PhoneNumber: normalizedNumber
            }
        });

        const phoneNumbers = searchResponse.data.incoming_phone_numbers || [];
        
        if (phoneNumbers.length === 0) {
            return res.status(404).json({ 
                error: `Phone number ${normalizedNumber} not found in your Twilio account. Please make sure you own this number.` 
            });
        }

        const twilioNumber = phoneNumbers[0];
        const phoneNumberSid = twilioNumber.sid;

        console.log('Found Twilio number with SID:', phoneNumberSid);

        // Configure Twilio webhook URL to point to our backend
        const webhookUrl = `https://callyy-production.up.railway.app/api/webhooks/twilio/voice`;
        const statusCallbackUrl = `https://callyy-production.up.railway.app/api/webhooks/twilio/status`;

        // Update the phone number in Twilio to use our webhook
        const updateUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${phoneNumberSid}.json`;
        
        const updateData = new URLSearchParams();
        updateData.append('VoiceUrl', webhookUrl);
        updateData.append('VoiceMethod', 'POST');
        updateData.append('StatusCallback', statusCallbackUrl);
        updateData.append('StatusCallbackMethod', 'POST');

        await axios.post(updateUrl, updateData.toString(), {
            auth: {
                username: accountSid,
                password: authToken
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        console.log('Twilio number configured with webhook:', webhookUrl);

        // Save to our database
        const { data: phoneNumberData, error: dbError } = await supabase
            .from('phone_numbers')
            .insert({
                number: normalizedNumber,
                provider: 'Twilio',
                label: label || twilioNumber.friendly_name || 'Twilio Number',
                twilio_phone_number: normalizedNumber,
                twilio_account_sid: accountSid,
                twilio_auth_token: authToken,
                twilio_phone_sid: phoneNumberSid,
                sms_enabled: smsEnabled || twilioNumber.capabilities?.sms || false,
                inbound_enabled: true,
                outbound_enabled: true,
                is_active: true,
                user_id: userId
            })
            .select()
            .single();

        if (dbError) {
            console.error('Database error saving phone number:', dbError);
            return res.status(500).json({ 
                error: 'Phone number configured in Twilio but failed to save to database: ' + dbError.message 
            });
        }

        console.log('Phone number imported successfully:', phoneNumberData.id);

        res.json({
            success: true,
            phoneNumber: phoneNumberData,
            webhookConfigured: true,
            webhookUrl,
            capabilities: twilioNumber.capabilities
        });

    } catch (error) {
        console.error('Twilio import error:', error.response?.data || error.message);
        
        // Handle specific Twilio errors
        if (error.response?.status === 401) {
            return res.status(401).json({ 
                error: 'Invalid Twilio credentials. Please check your Account SID and Auth Token.' 
            });
        }
        if (error.response?.status === 404) {
            return res.status(404).json({ 
                error: 'Phone number not found in your Twilio account.' 
            });
        }
        
        res.status(500).json({ 
            error: error.response?.data?.message || error.message || 'Failed to import Twilio number' 
        });
    }
});

/**
 * Import a Twilio phone number and configure webhook
 * POST /api/twilio/import-number
 * Body: { accountSid, authToken, phoneNumberSid, phoneNumber, label, userId }
 */
app.post('/api/twilio/import-number', async (req, res) => {
    try {
        const { accountSid, authToken, phoneNumberSid, phoneNumber, label, userId, smsEnabled } = req.body;

        if (!accountSid || !authToken || !phoneNumberSid || !phoneNumber || !userId) {
            return res.status(400).json({ 
                error: 'Account SID, Auth Token, Phone Number SID, Phone Number, and User ID are required' 
            });
        }

        console.log('Importing Twilio number:', phoneNumber, 'for user:', userId);

        // Configure Twilio webhook URL to point to our backend
        // This URL will handle inbound calls
        const webhookUrl = `https://callyy-production.up.railway.app/api/webhooks/twilio/voice`;
        const statusCallbackUrl = `https://callyy-production.up.railway.app/api/webhooks/twilio/status`;

        // Update the phone number in Twilio to use our webhook
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${phoneNumberSid}.json`;
        
        const updateData = new URLSearchParams();
        updateData.append('VoiceUrl', webhookUrl);
        updateData.append('VoiceMethod', 'POST');
        updateData.append('StatusCallback', statusCallbackUrl);
        updateData.append('StatusCallbackMethod', 'POST');

        const twilioResponse = await axios.post(twilioUrl, updateData.toString(), {
            auth: {
                username: accountSid,
                password: authToken
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        console.log('Twilio number configured with webhook:', webhookUrl);

        // Save to our database
        const { data: phoneNumberData, error: dbError } = await supabase
            .from('phone_numbers')
            .insert({
                number: phoneNumber,
                provider: 'Twilio',
                label: label || 'Twilio Number',
                twilio_phone_number: phoneNumber,
                twilio_account_sid: accountSid,
                twilio_auth_token: authToken, // In production, encrypt this
                twilio_phone_sid: phoneNumberSid,
                sms_enabled: smsEnabled || false,
                inbound_enabled: true,
                outbound_enabled: true,
                is_active: true,
                user_id: userId
            })
            .select()
            .single();

        if (dbError) {
            console.error('Database error saving phone number:', dbError);
            return res.status(500).json({ 
                error: 'Phone number configured in Twilio but failed to save to database: ' + dbError.message 
            });
        }

        console.log('Phone number saved to database:', phoneNumberData.id);

        res.json({
            success: true,
            phoneNumber: {
                id: phoneNumberData.id,
                number: phoneNumberData.number,
                provider: phoneNumberData.provider,
                label: phoneNumberData.label,
                twilioPhoneNumber: phoneNumberData.twilio_phone_number,
                twilioAccountSid: phoneNumberData.twilio_account_sid,
                smsEnabled: phoneNumberData.sms_enabled,
                inboundEnabled: phoneNumberData.inbound_enabled,
                outboundEnabled: phoneNumberData.outbound_enabled,
                isActive: phoneNumberData.is_active
            },
            webhookConfigured: true,
            webhookUrl
        });

    } catch (error) {
        console.error('Twilio import error:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            return res.status(401).json({ 
                error: 'Invalid Twilio credentials' 
            });
        }
        
        if (error.response?.status === 404) {
            return res.status(404).json({ 
                error: 'Phone number not found in your Twilio account' 
            });
        }
        
        res.status(500).json({ 
            error: error.response?.data?.message || error.message || 'Failed to import Twilio number' 
        });
    }
});

/**
 * Twilio Voice Webhook - Handles inbound calls
 * POST /api/webhooks/twilio/voice
 */
app.post('/api/webhooks/twilio/voice', async (req, res) => {
    try {
        const callData = req.body;
        console.log('Twilio voice webhook received:', {
            callSid: callData.CallSid,
            from: callData.From,
            to: callData.To,
            status: callData.CallStatus
        });

        // Find the phone number configuration
        const { data: phoneConfig } = await supabase
            .from('phone_numbers')
            .select('*, assistants(*)')
            .eq('twilio_phone_number', callData.To)
            .single();

        if (!phoneConfig) {
            console.log('No configuration found for number:', callData.To);
            // Return basic TwiML to reject the call gracefully
            res.type('text/xml');
            return res.send(`
                <Response>
                    <Say>Sorry, this number is not configured. Goodbye.</Say>
                    <Hangup/>
                </Response>
            `);
        }

        // If no assistant configured, provide a basic response
        if (!phoneConfig.assistant_id) {
            res.type('text/xml');
            return res.send(`
                <Response>
                    <Say>Thank you for calling. No assistant has been configured for this number yet. Please try again later.</Say>
                    <Hangup/>
                </Response>
            `);
        }

        // TODO: Integrate with your AI voice calling system
        // For now, return a placeholder response
        res.type('text/xml');
        res.send(`
            <Response>
                <Say voice="Polly.Joanna">Hello! Thank you for calling. This line is powered by Voicory AI. An assistant will be with you shortly.</Say>
                <Pause length="2"/>
                <Say voice="Polly.Joanna">Goodbye!</Say>
                <Hangup/>
            </Response>
        `);

    } catch (error) {
        console.error('Twilio voice webhook error:', error);
        res.type('text/xml');
        res.send(`
            <Response>
                <Say>We are experiencing technical difficulties. Please try again later.</Say>
                <Hangup/>
            </Response>
        `);
    }
});

/**
 * Twilio Status Callback - Handles call status updates
 * POST /api/webhooks/twilio/status
 */
app.post('/api/webhooks/twilio/status', async (req, res) => {
    try {
        const statusData = req.body;
        console.log('Twilio status callback:', {
            callSid: statusData.CallSid,
            status: statusData.CallStatus,
            duration: statusData.CallDuration
        });

        // Log call to database if needed
        // For now, just acknowledge
        res.sendStatus(200);

    } catch (error) {
        console.error('Twilio status callback error:', error);
        res.sendStatus(500);
    }
});

// ============================================
// SYSTEM PROMPT GENERATOR - AI-powered prompt creation
// Generates professional system prompts based on user description
// ============================================
app.post('/api/generate-prompt', async (req, res) => {
    try {
        if (!openai) {
            return res.status(503).json({ error: 'AI service not available' });
        }

        const { description, businessName, agentName, generateMessaging = false } = req.body;

        if (!description) {
            return res.status(400).json({ error: 'Description is required' });
        }

        console.log('Generating prompt for:', description, 'with messaging:', generateMessaging);

        const systemPromptForGenerator = `You are an expert prompt engineer specializing in creating system prompts for AI assistants. Your task is to generate professional, detailed SYSTEM PROMPTS (instructions FOR the AI) based on the user's description.

CRITICAL: You are writing INSTRUCTIONS for an AI assistant, NOT writing what the assistant would say. The system prompt should be in second person ("You are...", "Your role is...", "You should...") telling the AI how to behave.

=== STRUCTURE YOUR VOICE SYSTEM PROMPT WITH THESE SECTIONS ===

1. **IDENTITY & CONTEXT** (Use variables here)
   - Start with: "You are {{assistant_name}}, a [role] for [business]."
   - Include business context using variables like {{business_name}}, {{business_type}}
   - Set the scene: what kind of calls will this handle?

2. **CURRENT CUSTOMER CONTEXT** (Variable block)
   - Include a section with customer variables:
     "**Current Customer Context:**
     - Customer Name: {{customer_name}}
     - Phone: {{customer_phone}}
     - [Add business-specific variables like {{customer_id}}, {{last_order}}, {{membership_status}}, etc.]"
   - Add time context: "Current Time: {{current_time}}, Today's Date: {{current_date}}"

3. **CORE RESPONSIBILITIES**
   - List 4-6 specific things this assistant handles
   - Be specific to the business type (not generic)

4. **HOW TO COMMUNICATE**
   - Tone and personality guidelines
   - Language preferences
   - How to handle greetings and sign-offs
   - Pacing for voice (keep responses concise for phone)

5. **SCENARIO HANDLING**
   - How to handle the main use case (booking, support, etc.)
   - How to handle edge cases
   - What to do if customer is upset/confused
   - What to do when you need to escalate

6. **BUSINESS-SPECIFIC DETAILS**
   - Include placeholders for real business info using variables
   - Operating hours: {{business_hours}}
   - Location/address: {{business_address}}
   - Pricing if relevant: {{pricing_info}}
   - Policies: {{cancellation_policy}}, {{refund_policy}}

7. **BOUNDARIES & LIMITATIONS**
   - What the assistant should NOT do
   - When to transfer to human
   - Privacy/security guidelines

=== FORMATTING RULES ===
- Use ** for section headers (this renders well)
- Use - for bullet points
- Use {{variable_name}} syntax for ALL dynamic content
- Keep each response instruction focused on VOICE (short, clear, conversational)
- Total length: 400-700 words

=== VARIABLE USAGE ===
System variables (always available):
- {{customer_name}}, {{customer_phone}}, {{customer_email}}
- {{current_time}}, {{current_date}}, {{assistant_name}}

You MUST suggest 5-8 CUSTOM variables specific to this business type. Examples:
- For appointments: {{appointment_date}}, {{appointment_time}}, {{service_type}}
- For restaurants: {{reservation_size}}, {{dietary_requirements}}, {{table_preference}}
- For e-commerce: {{order_id}}, {{order_status}}, {{tracking_number}}
- For services: {{service_address}}, {{service_date}}, {{price_estimate}}

=== FIRST MESSAGE (VOICE) ===
Generate a natural, warm first message that:
- Uses {{assistant_name}} and business name
- Is SHORT (under 20 words for voice)
- Sounds natural when spoken aloud
- Invites the customer to share their need

${generateMessaging ? `
=== MESSAGING SYSTEM PROMPT ===
ALSO generate a separate messaging-optimized system prompt for WhatsApp/SMS with these differences:
- CAN be slightly longer in responses (text is scannable)
- CAN include emojis sparingly (😊, ✅, etc.)
- CAN include clickable links and formatted lists
- Should mention that conversations are asynchronous (customer may reply later)
- Should be mobile-friendly (under 300 chars per message ideal)
- Include ability to share images, documents, locations when relevant
- Structure should be similar but optimized for TEXT not VOICE

=== MESSAGING FIRST MESSAGE ===
Generate a friendly messaging welcome that:
- Can include 1-2 emojis
- Is mobile-friendly
- Feels casual but professional
- Example: "Hey! 👋 Thanks for reaching out to [Business]. I'm {{assistant_name}}, how can I help?"
` : ''}

=== CRITICAL OUTPUT RULES ===
1. The "systemPrompt" field must contain ONLY the voice system prompt text - no JSON, no metadata
2. The "firstMessage" field must contain a short greeting for voice calls
3. Do NOT leave any field empty or null
4. Do NOT include the JSON structure inside the systemPrompt text
${generateMessaging ? `5. The "messagingSystemPrompt" field must contain the messaging-optimized prompt
6. The "messagingFirstMessage" field must contain a messaging-friendly welcome` : ''}

Return your response in this exact JSON format:
{
    "systemPrompt": "You are {{assistant_name}}... [VOICE SYSTEM PROMPT - NO JSON INSIDE]",
    "firstMessage": "Hi! Thanks for calling [Business]. I'm {{assistant_name}}, how can I help?"${generateMessaging ? `,
    "messagingSystemPrompt": "You are {{assistant_name}}... [MESSAGING SYSTEM PROMPT - OPTIMIZED FOR TEXT]",
    "messagingFirstMessage": "Hey! 👋 Thanks for reaching out to [Business]. How can I help?"` : ''},
    "suggestedVariables": [
        {"name": "variable_name", "description": "Clear description", "example": "Example value"}
    ],
    "suggestedAgentName": "A fitting name for this type of assistant"
}`;

        const userMessage = `Create a comprehensive SYSTEM PROMPT (instructions for the AI) for:

Business/Use Case: ${description}
${businessName ? `Business Name: ${businessName}` : 'Business Name: [Let AI suggest or use a variable {{business_name}}]'}
${agentName ? `Agent Name: ${agentName}` : 'Agent Name: [Let AI suggest a fitting name]'}
${generateMessaging ? 'Generate for BOTH voice calls AND messaging (WhatsApp/SMS)' : 'Generate for voice calls only'}

Remember:
1. Write in SECOND PERSON as instructions TO the AI ("You are...", "You should...", "Your role is...")
2. Include ALL relevant {{variables}} for dynamic personalization
3. Be SPECIFIC to this business type - avoid generic customer service language
4. Structure with clear sections using ** headers
5. Keep voice-appropriate (concise responses, natural phrasing)
6. Suggest 5-8 business-specific custom variables
${generateMessaging ? '7. Make the messaging prompt TEXT-optimized (can use emojis, links, slightly longer responses)' : ''}

Generate a production-ready system prompt that makes this AI assistant highly effective.`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPromptForGenerator },
                { role: 'user', content: userMessage }
            ],
            temperature: 0.6,
            max_tokens: generateMessaging ? 5000 : 3000,
            response_format: { type: 'json_object' }
        });

        const responseText = completion.choices[0]?.message?.content;
        
        if (!responseText) {
            return res.status(500).json({ error: 'No response from AI' });
        }

        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse AI response:', responseText);
            return res.status(500).json({ error: 'Failed to parse AI response' });
        }

        // Validate and clean up the response
        if (!result.systemPrompt || typeof result.systemPrompt !== 'string') {
            console.error('Invalid systemPrompt in response:', result);
            return res.status(500).json({ error: 'Invalid response: missing systemPrompt' });
        }

        // Ensure firstMessage is not empty - provide a fallback if needed
        if (!result.firstMessage || result.firstMessage.trim() === '') {
            const businessNameStr = businessName || 'our company';
            const agentNameStr = result.suggestedAgentName || agentName || 'your assistant';
            result.firstMessage = `Hi! Thanks for calling ${businessNameStr}. I'm ${agentNameStr}, how can I help you today?`;
        }

        // Ensure messaging prompts have fallbacks if requested
        if (generateMessaging) {
            if (!result.messagingSystemPrompt || result.messagingSystemPrompt.trim() === '') {
                // Create a messaging version from the voice prompt
                result.messagingSystemPrompt = result.systemPrompt.replace(
                    /voice|spoken|phone call/gi,
                    'messaging'
                ) + '\n\nAdditional Messaging Guidelines:\n- Keep messages mobile-friendly (under 300 chars ideal)\n- Use emojis sparingly to add warmth 😊\n- Share clickable links when helpful\n- Remember conversations are asynchronous';
            }
            if (!result.messagingFirstMessage || result.messagingFirstMessage.trim() === '') {
                const businessNameStr = businessName || 'our company';
                const agentNameStr = result.suggestedAgentName || agentName || 'your assistant';
                result.messagingFirstMessage = `Hey! 👋 Thanks for reaching out to ${businessNameStr}. I'm ${agentNameStr}, how can I help you today?`;
            }
        }

        // Log usage
        const inputTokens = completion.usage?.prompt_tokens || 0;
        const outputTokens = completion.usage?.completion_tokens || 0;
        console.log('Prompt generation completed:', { inputTokens, outputTokens, generateMessaging });

        const response = {
            systemPrompt: result.systemPrompt,
            firstMessage: result.firstMessage,
            suggestedVariables: result.suggestedVariables || [],
            suggestedAgentName: result.suggestedAgentName,
            usage: { inputTokens, outputTokens }
        };

        // Include messaging prompts if requested
        if (generateMessaging) {
            response.messagingSystemPrompt = result.messagingSystemPrompt;
            response.messagingFirstMessage = result.messagingFirstMessage;
        }

        res.json(response);

    } catch (error) {
        console.error('Prompt generation error:', error);
        res.status(500).json({ error: error.message || 'Failed to generate prompt' });
    }
});

// ============================================
// TEST CHAT ENDPOINT - For testing agents in the dashboard
// Uses the SAME logic as WhatsApp processWithAI
// ============================================
app.post('/api/test-chat', async (req, res) => {
    try {
        if (!openai) {
            return res.status(503).json({ error: 'AI service not available' });
        }

        const { 
            message, 
            conversationHistory = [], 
            assistantId,  // If saved, use this to fetch from DB
            assistantConfig,  // Fallback for unsaved assistants
            userId,  // Required for billing - passed from frontend
            channel = 'calls'  // 'calls' or 'messaging' - determines which system prompt to use
        } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        if (!assistantId && !assistantConfig) {
            return res.status(400).json({ error: 'Either assistantId or assistantConfig is required' });
        }

        const isMessaging = channel === 'messaging';
        let assistant;
        let billingUserId = userId; // User ID for billing purposes

        // If assistantId provided, fetch from database (same as WhatsApp)
        if (assistantId) {
            // 🚀 CACHED: Use Redis cache for assistant lookup
            assistant = await getCachedAssistant(assistantId);

            if (!assistant) {
                console.error('Failed to fetch assistant:', assistantId);
                return res.status(404).json({ error: 'Assistant not found' });
            }
            // Use assistant's user_id for billing if not provided
            if (!billingUserId) {
                billingUserId = assistant.user_id;
            }
            
            // For saved assistants, use the appropriate system prompt based on channel
            if (isMessaging) {
                // Use messaging_system_prompt if available, otherwise fall back to system_prompt
                assistant.system_prompt = assistant.messaging_system_prompt || assistant.system_prompt;
                assistant.first_message = assistant.messaging_first_message || assistant.first_message;
            }
            
            console.log('Test chat - Using saved assistant:', assistant.name, 'Channel:', channel, 'Billing user:', billingUserId);
        } else {
            // Use passed config for unsaved assistants (convert to DB format)
            // The frontend already sends the correct systemPrompt based on channel
            assistant = {
                name: assistantConfig.name,
                system_prompt: assistantConfig.systemPrompt,
                first_message: assistantConfig.firstMessage,
                language_settings: assistantConfig.languageSettings,
                style_settings: assistantConfig.styleSettings,
                llm_model: assistantConfig.llmModel,
                temperature: assistantConfig.temperature,
                max_tokens: assistantConfig.maxTokens,
                dynamic_variables: assistantConfig.dynamicVariables,
                timezone: assistantConfig.timezone || 'Asia/Kolkata'
            };
            console.log('Test chat - Using unsaved config:', assistant.name, 'Billing user:', billingUserId);
        }

        // Require userId for billing
        if (!billingUserId) {
            return res.status(400).json({ error: 'userId is required for billing' });
        }

        // ===== SAME LOGIC AS processWithAI =====
        
        // Language and Style Settings
        const langSettings = assistant.language_settings || { default: 'en', autoDetect: false };
        const styleSettings = assistant.style_settings || { mode: 'friendly' };
        
        console.log('Test chat - Language:', langSettings.default, 'AutoDetect:', langSettings.autoDetect, 'Style:', styleSettings.mode);

        // Build system prompt
        let systemPrompt = assistant.system_prompt || 
            'You are a helpful, friendly AI assistant. Be conversational and helpful.';
        
        // Prepend the assistant's identity if a name is set
        if (assistant.name) {
            systemPrompt = `Your name is ${assistant.name}. When asked about your name, always say you are ${assistant.name}.\n\n${systemPrompt}`;
        }

        // Language settings - SAME as WhatsApp
        const langNames = {
            'en': 'English', 'en-GB': 'British English', 'en-AU': 'Australian English',
            'hi': 'Hindi', 'hi-Latn': 'Hinglish (Hindi written in English letters)',
            'ta': 'Tamil', 'te': 'Telugu', 'mr': 'Marathi', 'bn': 'Bengali',
            'gu': 'Gujarati', 'kn': 'Kannada', 'ml': 'Malayalam', 'pa': 'Punjabi',
            'es': 'Spanish', 'es-MX': 'Mexican Spanish', 'fr': 'French', 'de': 'German',
            'it': 'Italian', 'pt': 'Portuguese', 'pt-BR': 'Brazilian Portuguese',
            'nl': 'Dutch', 'pl': 'Polish', 'ru': 'Russian', 'ja': 'Japanese',
            'ko': 'Korean', 'zh': 'Chinese (Mandarin)', 'ar': 'Arabic', 'tr': 'Turkish'
        };
        const defaultLang = langSettings.default || 'en';
        const langName = langNames[defaultLang] || defaultLang;

        if (langSettings.autoDetect) {
            systemPrompt += `\n\nLANGUAGE: Detect the customer's language and respond in the same language they use. If they write in Hindi, respond in Hindi. If they write in Hinglish (Hindi in English letters), respond in Hinglish. Match their language preference.`;
        } else {
            // Strict language enforcement - SAME as WhatsApp
            const languagePrefix = `[MANDATORY LANGUAGE: ${langName.toUpperCase()}] - All your responses in this conversation MUST be in ${langName}. This overrides any previous conversation patterns.\n\n`;
            systemPrompt = languagePrefix + systemPrompt;
            systemPrompt += `\n\n⚠️ CRITICAL LANGUAGE RULE ⚠️: You MUST respond ONLY in ${langName}. This is a strict requirement that overrides everything else. 
- Even if the customer writes in Hindi, Hinglish, or any other language, YOUR response MUST be in ${langName}.
- Even if your previous responses in this conversation were in another language, you MUST now respond in ${langName}.
- Do NOT translate the customer's message - just respond in ${langName}.
- This rule is NON-NEGOTIABLE.`;
        }

        // Style settings - SAME as WhatsApp
        const styleMode = styleSettings.mode || 'friendly';
        switch (styleMode) {
            case 'professional':
                systemPrompt += `\n\nCOMMUNICATION STYLE: Be professional and formal. Use polished language, proper grammar, and structured responses. Avoid slang, contractions, or casual expressions.`;
                break;
            case 'friendly':
                systemPrompt += `\n\nCOMMUNICATION STYLE: Be warm, friendly, and conversational. Use a relaxed tone, feel free to use casual language, and be personable.`;
                break;
            case 'concise':
                systemPrompt += `\n\nCOMMUNICATION STYLE: Be brief and direct. Give short, to-the-point answers. Avoid unnecessary words or explanations unless specifically asked.`;
                break;
            case 'adaptive':
                const adaptiveConfig = styleSettings.adaptiveConfig || {};
                let adaptiveInstruction = `\n\nCOMMUNICATION STYLE: Adapt your style to match the customer's communication pattern.`;
                if (adaptiveConfig.mirrorFormality) {
                    adaptiveInstruction += ` If they're formal, be formal. If they're casual, be casual.`;
                }
                if (adaptiveConfig.mirrorLength) {
                    adaptiveInstruction += ` Match their message length - brief replies to brief messages, detailed responses to detailed questions.`;
                }
                if (adaptiveConfig.mirrorVocabulary) {
                    adaptiveInstruction += ` Use similar vocabulary complexity as they do.`;
                }
                systemPrompt += adaptiveInstruction;
                break;
        }

        // Resolve dynamic variables if available
        const dynamicVariables = assistant.dynamic_variables || { enableSystemVariables: true, variables: [] };
        const templateContext = {
            enableSystemVariables: dynamicVariables.enableSystemVariables,
            timezone: assistant.timezone || 'Asia/Kolkata',
            assistantName: assistant.name,
            customer: null, // No customer in test mode
            customVariables: dynamicVariables.variables || []
        };
        
        // Use the same resolveTemplateVariables function
        const resolvedSystemPrompt = resolveTemplateVariables(systemPrompt, templateContext);

        // Build messages array
        const messages = [{ role: 'system', content: resolvedSystemPrompt }];

        // Add first message as assistant's opening if this is the start of conversation
        if (conversationHistory.length === 0 && assistant.first_message) {
            messages.push({ role: 'assistant', content: assistant.first_message });
        }

        // Add conversation history
        for (const msg of conversationHistory) {
            messages.push({
                role: msg.role,
                content: msg.content
            });
        }

        // Add the current user message
        messages.push({ role: 'user', content: message });

        const model = assistant.llm_model || 'gpt-4o';
        console.log('Test chat - Model:', model, 'Messages:', messages.length);

        // Call OpenAI - SAME as WhatsApp
        const completion = await openai.chat.completions.create({
            model: model,
            messages: messages,
            temperature: parseFloat(assistant.temperature) || 0.7,
            max_tokens: assistant.max_tokens || 1024,
        });

        const response = completion.choices[0]?.message?.content;
        
        if (!response) {
            return res.status(500).json({ error: 'No response from AI' });
        }

        // ===== BILLING: Log LLM usage and deduct credits (SAME as WhatsApp) =====
        const inputTokens = completion.usage?.prompt_tokens || 0;
        const outputTokens = completion.usage?.completion_tokens || 0;
        const modelUsed = assistant.llm_model || 'gpt-4o';
        const provider = assistant.llm_provider || 'openai';

        let usageCost = null;
        let newBalance = null;

        if (inputTokens > 0 || outputTokens > 0) {
            try {
                const { data: usageResult, error: usageError } = await supabase.rpc('log_llm_usage', {
                    p_user_id: billingUserId,
                    p_assistant_id: assistantId || null,
                    p_provider: provider,
                    p_model: modelUsed,
                    p_input_tokens: inputTokens,
                    p_output_tokens: outputTokens,
                    p_call_log_id: null,
                    p_conversation_id: null
                });

                if (usageError) {
                    console.error('Failed to log test chat LLM usage:', usageError);
                } else {
                    usageCost = usageResult?.cost_inr;
                    newBalance = usageResult?.balance;
                    console.log('Test chat LLM usage logged:', {
                        model: modelUsed,
                        inputTokens,
                        outputTokens,
                        cost: usageCost,
                        newBalance: newBalance
                    });
                }
            } catch (logError) {
                console.error('Error logging test chat LLM usage:', logError);
            }
        }

        res.json({ 
            response,
            model: model,
            assistantName: assistant.name,
            usage: {
                inputTokens,
                outputTokens,
                totalTokens: inputTokens + outputTokens,
                cost: usageCost,
                balance: newBalance
            }
        });

    } catch (error) {
        console.error('Test chat error:', error);
        res.status(500).json({ error: error.message || 'Failed to process message' });
    }
});

// WhatsApp OAuth Callback
app.post('/api/whatsapp/oauth/callback', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
      return res.status(500).json({ error: 'Server configuration error: Missing Facebook credentials' });
    }

    // 1. Exchange code for access token
    const tokenResponse = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
      params: {
        client_id: appId,
        client_secret: appSecret,
        code: code
      }
    });

    const accessToken = tokenResponse.data.access_token;

    // 2. Get WABA details using the access token
    // We first get the user's ID (System User) and their businesses/accounts
    const meResponse = await axios.get('https://graph.facebook.com/v21.0/me', {
      params: {
        access_token: accessToken,
        fields: 'id,name,accounts' // accounts usually contains the pages/WABAs
      }
    });

    // Note: The structure of the response depends on what the user shared.
    // For Embedded Signup, we typically look for the WABA in the shared accounts.
    // If 'accounts' is empty, we might need to check 'businesses' or specific edges.
    
    // However, a more direct way often used in Embedded Signup is to query the debug_token 
    // to see what granular scopes/assets were granted, OR just list the WABAs this token can access.
    
    // Let's try to fetch WABAs directly if possible, or iterate through accounts.
    // A common pattern for System Users created via Embedded Signup is that they have access to the WABA.
    
    // Let's try to fetch the WABAs associated with this token.
    // Since we don't know the WABA ID, we can try to list client_whatsapp_business_accounts if this was a Tech Provider flow,
    // but for direct integration, we check 'accounts'.
    
    // FALLBACK: If we can't easily determine the WABA from /me, we might need the frontend to pass the WABA ID 
    // if it was available in the client response (it often is in the 'config' object of the JS SDK response).
    // But let's assume we need to find it.
    
    // Strategy: Get the WABA ID.
    // The System User should have access to the WABA.
    // Let's try to get the WABA ID from the token debug endpoint or by listing accounts.
    
    // For now, let's assume the first account found is the target, or we return the token and let the user pick?
    // No, the UI expects a single config.
    
    // Let's try to fetch phone numbers directly if we can find the WABA.
    // Actually, let's fetch the WABA ID from the 'granularity' of the token if available, 
    // or just list the WABAs.
    
    // A reliable way:
    // GET /v21.0/me/accounts?fields=name,category,id
    // Filter for category = 'WhatsApp Business Account' (though sometimes it's not explicit).
    
    // Let's try a different approach:
    // The token belongs to a System User. That System User is added to the WABA.
    // We can query: GET /v21.0/me/assigned_business_accounts (if applicable) or just /me/accounts.
    
    // Let's stick to a simple flow:
    // 1. Get Token.
    // 2. Get WABA (we'll assume the token gives access to the one created/selected).
    // 3. Get Phone Number.

    // Let's try to get the shared WABA ID.
    // In many Embedded Signup implementations, the WABA ID is passed in the initial setup, 
    // but if we only have the code, we must discover it.
    
    // Let's try to fetch the WABAs this user has access to.
    const accountsResponse = await axios.get('https://graph.facebook.com/v21.0/me/accounts', {
        params: {
            access_token: accessToken,
            fields: 'id,name,category,access_token'
        }
    });
    
    // This endpoint usually returns Pages. WABAs are different.
    // WABAs are accessed via the Business Manager.
    
    // Let's try fetching the WABAs directly.
    // There isn't a direct /me/whatsapp_business_accounts endpoint for System Users in the same way.
    // However, we can try to get the business ID and then list WABAs.
    
    // SIMPLIFICATION FOR MVP:
    // We will return the access token and the user's name.
    // We will try to fetch the phone number if we can find a WABA.
    // If we can't find it automatically, we might need to ask the user to enter the WABA ID, 
    // but the UI expects us to return it.
    
    // Let's try to get the WABA ID from the debug_token endpoint which lists the granular scopes.
    const debugTokenResponse = await axios.get('https://graph.facebook.com/v21.0/debug_token', {
        params: {
            input_token: accessToken,
            access_token: `${appId}|${appSecret}`
        }
    });
    
    const granularScopes = debugTokenResponse.data.data.granular_scopes || [];
    let wabaId = null;
    
    // Look for whatsapp_business_management scope and its target_ids
    const wabaScope = granularScopes.find(scope => scope.scope === 'whatsapp_business_management');
    if (wabaScope && wabaScope.target_ids && wabaScope.target_ids.length > 0) {
        wabaId = wabaScope.target_ids[0];
    }
    
    if (!wabaId) {
        // Fallback: Try to find it via other means or throw error
        // For now, let's try to proceed or return what we have.
        // If we can't find WABA ID, we can't find phone numbers.
        console.log('Could not find WABA ID in granular scopes. Response:', JSON.stringify(debugTokenResponse.data));
        // We might need to return an error or ask the user to provide it.
        // But let's try to fetch phone numbers from the 'me' endpoint if it acts as a WABA context? No.
    }

    let phoneNumberId = '';
    let displayPhoneNumber = '';
    let displayName = '';

    if (wabaId) {
        // Fetch phone numbers for this WABA
        const phoneNumbersResponse = await axios.get(`https://graph.facebook.com/v21.0/${wabaId}/phone_numbers`, {
            params: {
                access_token: accessToken
            }
        });
        
        if (phoneNumbersResponse.data.data && phoneNumbersResponse.data.data.length > 0) {
            const phoneData = phoneNumbersResponse.data.data[0];
            phoneNumberId = phoneData.id;
            displayPhoneNumber = phoneData.display_phone_number;
            displayName = phoneData.verified_name || phoneData.display_phone_number;
        }
    }

    res.json({
        accessToken,
        wabaId: wabaId || '',
        phoneNumberId,
        displayPhoneNumber,
        displayName: displayName || 'WhatsApp Business'
    });

  } catch (error) {
    console.error('OAuth Error:', error.response ? error.response.data : error.message);
    res.status(500).json({ 
        error: 'Failed to complete OAuth flow', 
        details: error.response ? error.response.data : error.message 
    });
  }
});

// ============================================
// WHATSAPP WEBHOOK ENDPOINTS
// ============================================

// Webhook Verification (GET) - Meta will call this to verify your webhook
app.get('/api/webhooks/whatsapp', async (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('Webhook verification request:', { mode, token, challenge });

    if (mode === 'subscribe') {
        // Look up the verify token in our database
        const { data: config, error } = await supabase
            .from('whatsapp_configs')
            .select('id, webhook_verify_token')
            .eq('webhook_verify_token', token)
            .single();

        if (config) {
            console.log('Webhook verified for config:', config.id);
            res.status(200).send(challenge);
        } else {
            console.log('Invalid verify token');
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(403);
    }
});

// Webhook Events (POST) - Meta sends message/call events here
app.post('/api/webhooks/whatsapp', async (req, res) => {
    try {
        const body = req.body;
        console.log('Webhook received:', JSON.stringify(body, null, 2));

        // Always respond 200 quickly to acknowledge receipt
        res.sendStatus(200);

        // Process the webhook asynchronously
        if (body.object === 'whatsapp_business_account') {
            for (const entry of body.entry || []) {
                const wabaId = entry.id;
                
                // 🚀 CACHED: Find the config for this WABA (fast Redis lookup)
                const config = await getCachedWhatsAppConfig(wabaId);

                if (!config) {
                    console.log('No config found for WABA:', wabaId);
                    continue;
                }

                for (const change of entry.changes || []) {
                    const field = change.field;
                    const value = change.value;

                    if (field === 'messages') {
                        // Handle incoming messages
                        await handleIncomingMessages(config, value);
                    } else if (field === 'message_status') {
                        // Handle message status updates
                        await handleMessageStatus(config, value);
                    } else if (field === 'calls') {
                        // Handle call events
                        await handleCallEvents(config, value);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Webhook processing error:', error);
        // Already sent 200, so just log the error
    }
});

// Handle incoming WhatsApp messages
async function handleIncomingMessages(config, value) {
    const messages = value.messages || [];
    const contacts = value.contacts || [];
    const metadata = value.metadata || {};

    for (const message of messages) {
        const contact = contacts.find(c => c.wa_id === message.from) || {};
        
        // Skip duplicate/old messages (older than 5 minutes)
        const messageTimestamp = parseInt(message.timestamp) * 1000;
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        if (messageTimestamp < fiveMinutesAgo) {
            console.log('Skipping old message (older than 5 min):', message.id, new Date(messageTimestamp).toISOString());
            continue;
        }

        // 🚀 FAST: Check Redis for duplicate (instead of DB query)
        if (await isMessageProcessed(message.id)) {
            console.log('Skipping duplicate message (Redis):', message.id);
            continue;
        }
        
        // Mark as processed immediately
        await markMessageProcessed(message.id);

        // Find or create customer for this phone number (for linking messages)
        const phoneNumber = '+' + message.from;
        const contactName = contact.profile?.name || 'WhatsApp User';
        let customerId = null;
        
        // Try to find existing customer
        let { data: customer } = await supabase
            .from('customers')
            .select('id')
            .eq('user_id', config.user_id)
            .eq('phone_number', phoneNumber)
            .single();
        
        if (!customer) {
            // Create new customer
            const { data: newCustomer } = await supabase
                .from('customers')
                .insert({
                    user_id: config.user_id,
                    name: contactName,
                    phone_number: phoneNumber,
                    email: '',
                    variables: {},
                    has_memory: true
                })
                .select('id')
                .single();
            
            if (newCustomer) {
                customer = newCustomer;
                console.log('Created new customer for WhatsApp:', customer.id, contactName);
            }
        }
        
        if (customer) {
            customerId = customer.id;
        }

        // Upsert contact
        await supabase
            .from('whatsapp_contacts')
            .upsert({
                config_id: config.id,
                wa_id: message.from,
                phone_number: '+' + message.from,
                profile_name: contact.profile?.name,
                last_message_at: new Date().toISOString(),
                conversation_window_open: true,
                window_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            }, { onConflict: 'config_id,wa_id' });

        // Store message
        const content = {};
        if (message.type === 'text') {
            content.body = message.text?.body;
        } else if (message.type === 'image') {
            content.mediaId = message.image?.id;
            content.caption = message.image?.caption;
        } else if (message.type === 'audio') {
            content.mediaId = message.audio?.id;
        } else if (message.type === 'video') {
            content.mediaId = message.video?.id;
            content.caption = message.video?.caption;
        } else if (message.type === 'document') {
            content.mediaId = message.document?.id;
            content.filename = message.document?.filename;
        } else if (message.type === 'location') {
            content.latitude = message.location?.latitude;
            content.longitude = message.location?.longitude;
            content.name = message.location?.name;
            content.address = message.location?.address;
        }

        const { data: insertedMessage } = await supabase
            .from('whatsapp_messages')
            .insert({
                wa_message_id: message.id,
                config_id: config.id,
                from_number: '+' + message.from,
                to_number: metadata.display_phone_number,
                direction: 'inbound',
                message_type: message.type,
                content: content,
                status: 'received',
                context_message_id: message.context?.id,
                message_timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
                customer_id: customerId
            })
            .select('id')
            .single();

        console.log('Stored incoming message:', message.id, 'Customer:', customerId);

        // Generate and store embedding for text messages (async, don't block)
        if (message.type === 'text' && content.body && customerId && insertedMessage?.id) {
            storeMessageEmbedding(insertedMessage.id, customerId, config.user_id, content.body, 'user')
                .catch(err => console.error('Failed to store embedding:', err.message));
        }

        // If chatbot is enabled, process with AI and send response
        if (config.chatbot_enabled && config.assistant_id && message.type === 'text') {
            await processWithAI(config, message, contact);
        }
    }
}

// ============================================
// AI CHATBOT PROCESSING
// ============================================

// Show typing indicator to the user
async function showTypingIndicator(config, messageId) {
    try {
        let accessToken = config.access_token?.trim().replace(/[\r\n]/g, '');
        if (accessToken?.includes('=')) {
            accessToken = accessToken.split('=').pop();
        }
        
        if (!accessToken) {
            console.error('No access token for typing indicator');
            return;
        }

        const response = await axios.post(
            `https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`,
            {
                messaging_product: 'whatsapp',
                status: 'read',
                message_id: messageId,
                typing_indicator: {
                    type: 'text'
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('Typing indicator shown for message:', messageId);
        return response.data;
    } catch (error) {
        console.error('Failed to show typing indicator:', error.response?.data || error.message);
        // Don't throw - typing indicator is not critical
    }
}

// Process incoming message with AI and send response
async function processWithAI(config, message, contact) {
    try {
        console.log('Processing message with AI for assistant:', config.assistant_id);
        
        // Show typing indicator immediately so user knows we're processing
        await showTypingIndicator(config, message.id);

        // 🚀 CACHED: Fetch assistant configuration from Redis
        const assistant = await getCachedAssistant(config.assistant_id);

        if (!assistant) {
            console.error('Failed to fetch assistant:', config.assistant_id);
            return;
        }

        // Check if assistant is published (active) - don't process with draft assistants
        if (assistant.status !== 'active') {
            console.log('Assistant is not published (status:', assistant.status, ') - skipping AI processing');
            return;
        }

        // Log assistant settings including language and style
        // IMPORTANT: Default autoDetect to false so language enforcement works by default
        const langSettings = assistant.language_settings || { default: 'en', autoDetect: false };
        const styleSettings = assistant.style_settings || { mode: 'friendly' };
        console.log('Using assistant:', assistant.name, 
            'Model:', assistant.llm_model, 
            'Language:', langSettings.default, 
            'AutoDetect:', langSettings.autoDetect,
            'Style:', styleSettings.mode,
            'Memory:', assistant.memory_enabled);

        // 2. Get or create customer for this contact (for memory tracking AND dynamic variables)
        let customerId = null;
        let customerMemory = null;
        let customerData = null; // For dynamic variables
        
        const phoneNumber = '+' + message.from;
        const contactName = contact?.profile?.name || 'WhatsApp User';
        
        // Check if we need customer data (memory or dynamic variables enabled)
        const dynamicVariables = assistant.dynamic_variables || { enableSystemVariables: true, variables: [] };
        const needsCustomerData = assistant.memory_enabled || 
            dynamicVariables.enableSystemVariables || 
            (dynamicVariables.variables && dynamicVariables.variables.length > 0);
        
        if (needsCustomerData) {
            // Try to find existing customer
            let { data: customer } = await supabase
                .from('customers')
                .select('*')
                .eq('user_id', config.user_id)
                .eq('phone_number', phoneNumber)
                .single();
            
            if (!customer) {
                // Create new customer
                const { data: newCustomer, error: createError } = await supabase
                    .from('customers')
                    .insert({
                        user_id: config.user_id,
                        name: contactName,
                        phone_number: phoneNumber,
                        email: '',
                        variables: {},
                        has_memory: assistant.memory_enabled || false
                    })
                    .select('*')
                    .single();
                
                if (newCustomer) {
                    customer = newCustomer;
                    console.log('Created new customer:', customer.id);
                }
            }
            
            if (customer) {
                customerId = customer.id;
                customerData = customer; // Store full customer data for variables
                
                // Fetch customer memory context using the database function (only if memory enabled)
                if (assistant.memory_enabled) {
                    const { data: memoryContext, error: memoryError } = await supabase
                        .rpc('get_customer_context', { 
                            p_customer_id: customerId,
                            p_max_conversations: assistant.memory_config?.max_context_conversations || 5
                        });
                    
                    if (memoryContext && !memoryError) {
                        customerMemory = memoryContext;
                        console.log('Loaded customer memory for:', customerMemory?.customer?.name || customerId);
                    }
                }
            }
        }

        // 3. Get current message text first
        const currentMsgText = message.text?.body;
        
        // 4. Get recent history (last 6 messages) + semantically relevant messages
        // This hybrid approach ensures recent context + relevant past info
        const { data: recentHistory } = await supabase
            .from('whatsapp_messages')
            .select('id, direction, content, message_type, message_timestamp')
            .eq('config_id', config.id)
            .or(`from_number.eq.+${message.from},to_number.eq.+${message.from}`)
            .order('message_timestamp', { ascending: false })
            .limit(6); // Only last 6 messages for recent context
        
        // Reverse to get chronological order
        const history = recentHistory ? recentHistory.reverse() : [];
        
        // 5. If customer has embeddings, search for relevant past messages
        let relevantPastMessages = [];
        if (customerId && currentMsgText) {
            // Check if user is asking about something from the past
            const isRecallQuery = /recall|remember|order|previous|earlier|last time|before/i.test(currentMsgText);
            
            if (isRecallQuery) {
                console.log('Recall query detected, searching embeddings...');
                relevantPastMessages = await searchRelevantMessages(customerId, currentMsgText, 8);
                console.log(`Found ${relevantPastMessages.length} relevant past messages via embeddings`);
            }
        }

        // 6. Build messages array for OpenAI
        const messages = [];

        // System prompt - Use messaging_system_prompt for WhatsApp, fall back to system_prompt
        // This ensures WhatsApp uses the messaging-optimized prompt
        let systemPrompt = assistant.messaging_system_prompt || assistant.system_prompt || 
            'You are a helpful, friendly AI assistant. Be conversational and helpful.';
        
        // Prepend the assistant's identity if a name is set
        if (assistant.name) {
            systemPrompt = `Your name is ${assistant.name}. When asked about your name, always say you are ${assistant.name}.\n\n${systemPrompt}`;
        }
        
        // Inject Language Settings (use existing langSettings/styleSettings from above)
        const languageSettings = langSettings;
        
        // Build language instruction
        let languageInstruction = '';
        let languagePrefix = ''; // For prepending strict rule at the beginning
        const langNames = {
            'en': 'English', 'en-GB': 'British English', 'en-AU': 'Australian English',
            'hi': 'Hindi', 'hi-Latn': 'Hinglish (Hindi written in English letters)',
            'ta': 'Tamil', 'te': 'Telugu', 'mr': 'Marathi', 'bn': 'Bengali',
            'gu': 'Gujarati', 'kn': 'Kannada', 'ml': 'Malayalam', 'pa': 'Punjabi',
            'es': 'Spanish', 'es-MX': 'Mexican Spanish', 'fr': 'French', 'de': 'German',
            'it': 'Italian', 'pt': 'Portuguese', 'pt-BR': 'Brazilian Portuguese',
            'nl': 'Dutch', 'pl': 'Polish', 'ru': 'Russian', 'ja': 'Japanese',
            'ko': 'Korean', 'zh': 'Chinese (Mandarin)', 'ar': 'Arabic', 'tr': 'Turkish'
        };
        const defaultLang = languageSettings.default || 'en';
        const langName = langNames[defaultLang] || defaultLang;
        
        if (languageSettings.autoDetect) {
            // Auto-detect ON: Respond in customer's language
            languageInstruction = `\n\nLANGUAGE: Detect the customer's language and respond in the same language they use. If they write in Hindi, respond in Hindi. If they write in Hinglish (Hindi in English letters), respond in Hinglish. Match their language preference.`;
        } else {
            // Auto-detect OFF: Always use the configured default language - VERY STRONG instruction
            // Add at BEGINNING to take highest priority
            languagePrefix = `[MANDATORY LANGUAGE: ${langName.toUpperCase()}] - All your responses in this conversation MUST be in ${langName}. This overrides any previous conversation patterns.\n\n`;
            languageInstruction = `\n\n⚠️ CRITICAL LANGUAGE RULE ⚠️: You MUST respond ONLY in ${langName}. This is a strict requirement that overrides everything else. 
- Even if the customer writes in Hindi, Hinglish, or any other language, YOUR response MUST be in ${langName}.
- Even if your previous responses in this conversation were in another language, you MUST now respond in ${langName}.
- Do NOT translate the customer's message - just respond in ${langName}.
- This rule is NON-NEGOTIABLE.`;
        }
        
        // Prepend language prefix if set (for strict language enforcement)
        if (languagePrefix) {
            systemPrompt = languagePrefix + systemPrompt;
        }
        
        // Build style instruction
        let styleInstruction = '';
        const styleMode = styleSettings.mode || 'friendly';
        switch (styleMode) {
            case 'professional':
                styleInstruction = `\n\nCOMMUNICATION STYLE: Be professional and formal. Use polished language, proper grammar, and structured responses. Avoid slang, contractions, or casual expressions.`;
                break;
            case 'friendly':
                styleInstruction = `\n\nCOMMUNICATION STYLE: Be warm, friendly, and conversational. Use a relaxed tone, feel free to use casual language, and be personable.`;
                break;
            case 'concise':
                styleInstruction = `\n\nCOMMUNICATION STYLE: Be brief and direct. Give short, to-the-point answers. Avoid unnecessary words or explanations unless specifically asked.`;
                break;
            case 'adaptive':
                const adaptiveConfig = styleSettings.adaptiveConfig || {};
                styleInstruction = `\n\nCOMMUNICATION STYLE: Adapt your style to match the customer's communication pattern.`;
                if (adaptiveConfig.mirrorFormality) {
                    styleInstruction += ` If they're formal, be formal. If they're casual, be casual.`;
                }
                if (adaptiveConfig.mirrorLength) {
                    styleInstruction += ` Match their message length - brief replies to brief messages, detailed responses to detailed questions.`;
                }
                if (adaptiveConfig.mirrorVocabulary) {
                    styleInstruction += ` Use similar vocabulary complexity as they do.`;
                }
                break;
        }
        
        // Add language and style to system prompt
        if (languageInstruction) {
            systemPrompt += languageInstruction;
        }
        if (styleInstruction) {
            systemPrompt += styleInstruction;
        }
        
        // Add instruction to use conversation context
        systemPrompt += `\n\nIMPORTANT: You have access to the conversation history with this customer. When the customer asks about previous orders, details they mentioned, or anything from earlier, use the context provided. Never say you can't recall.`;
        
        // Inject customer memory if available
        if (customerMemory && assistant.memory_enabled) {
            const memoryConfig = assistant.memory_config || {};
            const memoryContext = formatMemoryForPrompt(customerMemory, memoryConfig);
            if (memoryContext) {
                systemPrompt = `${systemPrompt}\n\n${memoryContext}`;
                console.log('Injected memory context for customer');
            }
        }
        
        // Add relevant past messages as context (from embeddings search)
        if (relevantPastMessages.length > 0) {
            systemPrompt += '\n\n--- RELEVANT PAST CONTEXT ---\n';
            systemPrompt += 'Here are relevant messages from past conversations:\n';
            relevantPastMessages.forEach((msg, i) => {
                const speaker = msg.role === 'user' ? 'Customer' : 'You';
                systemPrompt += `${speaker}: ${msg.content}\n`;
            });
            systemPrompt += '--- END PAST CONTEXT ---';
        }
        
        // Resolve dynamic variables in system prompt
        const templateContext = {
            enableSystemVariables: dynamicVariables.enableSystemVariables,
            timezone: assistant.timezone || 'Asia/Kolkata',
            assistantName: assistant.name,
            customer: customerData ? {
                name: customerData.name,
                phone: customerData.phone_number,
                email: customerData.email,
                variables: customerData.variables || {}
            } : null,
            customVariables: dynamicVariables.variables || []
        };
        
        const resolvedSystemPrompt = resolveTemplateVariables(systemPrompt, templateContext);
        
        // Log if any variables were resolved
        if (systemPrompt !== resolvedSystemPrompt) {
            console.log('Resolved dynamic variables in system prompt');
        }
        
        messages.push({
            role: 'system',
            content: resolvedSystemPrompt
        });

        // Add recent conversation history (last 6 messages only)
        if (history && history.length > 0) {
            for (const msg of history) {
                if (msg.message_type === 'text' && msg.content?.body) {
                    messages.push({
                        role: msg.direction === 'inbound' ? 'user' : 'assistant',
                        content: msg.content.body
                    });
                }
            }
        }

        // Add current message (if not already in history)
        if (currentMsgText) {
            // Check if last message in history is the same
            const lastHistoryMsg = history?.[history.length - 1];
            if (!lastHistoryMsg || lastHistoryMsg.content?.body !== currentMsgText) {
                messages.push({
                    role: 'user',
                    content: currentMsgText
                });
            }
        }

        console.log('Sending to OpenAI with', messages.length, 'messages (optimized with embeddings)');

        // 4. Call OpenAI API
        const completion = await openai.chat.completions.create({
            model: assistant.llm_model || 'gpt-4o',
            messages: messages,
            temperature: parseFloat(assistant.temperature) || 0.7,
            max_tokens: assistant.max_tokens || 1024
        });

        const aiResponse = completion.choices[0]?.message?.content;

        if (!aiResponse) {
            console.error('No response from OpenAI');
            return;
        }

        console.log('AI Response:', aiResponse.substring(0, 100) + '...');

        // 5. Log LLM usage and deduct credits
        const inputTokens = completion.usage?.prompt_tokens || 0;
        const outputTokens = completion.usage?.completion_tokens || 0;
        const modelUsed = assistant.llm_model || 'gpt-4o';
        const provider = assistant.llm_provider || 'openai';

        if (inputTokens > 0 || outputTokens > 0) {
            try {
                const { data: usageResult, error: usageError } = await supabase.rpc('log_llm_usage', {
                    p_user_id: config.user_id,
                    p_assistant_id: assistant.id,
                    p_provider: provider,
                    p_model: modelUsed,
                    p_input_tokens: inputTokens,
                    p_output_tokens: outputTokens,
                    p_call_log_id: null,
                    p_conversation_id: null
                });

                if (usageError) {
                    console.error('Failed to log LLM usage:', usageError);
                } else {
                    console.log('LLM usage logged:', {
                        model: modelUsed,
                        inputTokens,
                        outputTokens,
                        cost: usageResult?.cost_inr,
                        newBalance: usageResult?.balance
                    });
                }
            } catch (logError) {
                console.error('Error logging LLM usage:', logError);
            }
        }

        // 6. Send reply via WhatsApp API (pass customerId to link message)
        await sendWhatsAppReply(config, message.from, aiResponse, customerId);
        
        // 7. If memory is enabled, store conversation record and analyze for insights
        if (assistant.memory_enabled && customerId) {
            try {
                // Build transcript from current exchange
                const transcript = [];
                
                // Add history messages
                if (history && history.length > 0) {
                    for (const msg of history) {
                        if (msg.message_type === 'text' && msg.content?.body) {
                            transcript.push({
                                role: msg.direction === 'inbound' ? 'user' : 'assistant',
                                content: msg.content.body,
                                timestamp: msg.message_timestamp
                            });
                        }
                    }
                }
                
                // Add current exchange
                if (currentMsgText) {
                    transcript.push({
                        role: 'user',
                        content: currentMsgText,
                        timestamp: new Date().toISOString()
                    });
                }
                transcript.push({
                    role: 'assistant',
                    content: aiResponse,
                    timestamp: new Date().toISOString()
                });
                
                // Update customer interaction stats immediately
                const userMessages = transcript.filter(m => m.role === 'user');
                const userMessageCount = userMessages.length;
                
                await supabase
                    .from('customers')
                    .update({
                        last_interaction: new Date().toISOString(),
                        has_memory: true,
                        interaction_count: userMessageCount
                    })
                    .eq('id', customerId);
                
                // Analyze conversation every 3 user messages
                const shouldAnalyze = userMessageCount >= 3 && userMessageCount % 3 === 0;
                console.log(`User messages: ${userMessageCount}, Should analyze: ${shouldAnalyze}`);
                
                if (shouldAnalyze && assistant.memory_config?.extractInsights) {
                    console.log('Analyzing conversation for insights...');
                    const analysis = await analyzeConversationWithAI(transcript.slice(-10), assistant.name);
                    
                    if (analysis) {
                        // Update customer with extracted info (email, name, etc.)
                        if (analysis.extractedInfo) {
                            const updateData = {};
                            if (analysis.extractedInfo.email) {
                                updateData.email = analysis.extractedInfo.email;
                                console.log('Extracted email:', analysis.extractedInfo.email);
                            }
                            if (analysis.extractedInfo.name) {
                                updateData.name = analysis.extractedInfo.name;
                                console.log('Extracted name:', analysis.extractedInfo.name);
                            }
                            if (analysis.extractedInfo.address || analysis.extractedInfo.company) {
                                // Store in variables
                                const { data: currentCustomer } = await supabase
                                    .from('customers')
                                    .select('variables')
                                    .eq('id', customerId)
                                    .single();
                                
                                updateData.variables = {
                                    ...(currentCustomer?.variables || {}),
                                    ...(analysis.extractedInfo.address && { address: analysis.extractedInfo.address }),
                                    ...(analysis.extractedInfo.company && { company: analysis.extractedInfo.company })
                                };
                            }
                            
                            if (Object.keys(updateData).length > 0) {
                                await supabase
                                    .from('customers')
                                    .update(updateData)
                                    .eq('id', customerId);
                                console.log('Updated customer with extracted info:', Object.keys(updateData));
                            }
                        }
                        
                        // Store/update conversation record with analysis (channel = whatsapp)
                        // Check if there's an existing conversation from today for this customer
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        
                        const { data: existingConv } = await supabase
                            .from('customer_conversations')
                            .select('id')
                            .eq('customer_id', customerId)
                            .eq('channel', 'whatsapp')
                            .gte('started_at', today.toISOString())
                            .order('started_at', { ascending: false })
                            .limit(1)
                            .single();
                        
                        if (existingConv) {
                            // Update existing conversation
                            const { error: convError } = await supabase
                                .from('customer_conversations')
                                .update({
                                    transcript: transcript,
                                    summary: analysis.summary,
                                    key_points: analysis.keyPoints || [],
                                    sentiment: analysis.sentiment,
                                    sentiment_score: analysis.sentimentScore,
                                    topics_discussed: analysis.topicsDiscussed || [],
                                    action_items: analysis.actionItems || [],
                                    updated_at: new Date().toISOString()
                                })
                                .eq('id', existingConv.id);
                            
                            if (convError) {
                                console.error('Error updating conversation:', convError);
                            } else {
                                console.log('Updated existing conversation for customer:', customerId);
                            }
                        } else {
                            // Create new conversation
                            const { error: convError } = await supabase
                                .from('customer_conversations')
                                .insert({
                                    customer_id: customerId,
                                    assistant_id: assistant.id,
                                    user_id: config.user_id,
                                    channel: 'whatsapp',
                                    call_direction: 'inbound',
                                    started_at: new Date(history?.[0]?.message_timestamp || Date.now()).toISOString(),
                                    transcript: transcript,
                                    summary: analysis.summary,
                                    key_points: analysis.keyPoints || [],
                                    sentiment: analysis.sentiment,
                                    sentiment_score: analysis.sentimentScore,
                                    topics_discussed: analysis.topicsDiscussed || [],
                                    action_items: analysis.actionItems || []
                                });
                            
                            if (convError) {
                                console.error('Error storing conversation:', convError);
                            } else {
                                console.log('Created new conversation for customer:', customerId);
                            }
                        }
                        
                        // Store extracted insights
                        if (analysis.insights && analysis.insights.length > 0) {
                            const insightsToInsert = analysis.insights.map(insight => ({
                                customer_id: customerId,
                                user_id: config.user_id,
                                insight_type: insight.type || 'custom',
                                content: insight.content,
                                importance: insight.importance || 'medium',
                                confidence: 0.8
                            }));
                            
                            const { error: insightError } = await supabase
                                .from('customer_insights')
                                .insert(insightsToInsert);
                            
                            if (insightError) {
                                console.error('Error storing insights:', insightError);
                            } else {
                                console.log('Stored', insightsToInsert.length, 'insights for customer');
                            }
                        }
                    }
                }
            } catch (memoryError) {
                console.error('Error updating customer memory:', memoryError);
                // Don't throw - memory update failure shouldn't break the main flow
            }
        }

    } catch (error) {
        console.error('AI processing error:', error);
    }
}

// Send WhatsApp reply message
async function sendWhatsAppReply(config, toNumber, text, customerId = null) {
    try {
        // Clean the access token (remove any newlines, whitespace, and strip prefix if exists)
        let accessToken = config.access_token?.trim().replace(/[\r\n]/g, '');
        
        // Strip common prefixes that might be accidentally stored
        if (accessToken?.includes('=')) {
            accessToken = accessToken.split('=').pop();
        }
        
        if (!accessToken) {
            console.error('No access token found for config:', config.id);
            return;
        }

        console.log('Sending WhatsApp reply to:', toNumber, 'Token length:', accessToken.length);

        const response = await axios.post(
            `https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`,
            {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: toNumber,
                type: 'text',
                text: {
                    body: text,
                    preview_url: false
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const waMessageId = response.data?.messages?.[0]?.id;
        console.log('WhatsApp reply sent:', waMessageId);

        // Store outbound message in database
        const { data: insertedOutbound } = await supabase
            .from('whatsapp_messages')
            .insert({
                wa_message_id: waMessageId,
                config_id: config.id,
                from_number: config.display_phone_number,
                to_number: '+' + toNumber,
                direction: 'outbound',
                message_type: 'text',
                content: { body: text },
                status: 'sent',
                is_from_bot: true,
                assistant_id: config.assistant_id,
                message_timestamp: new Date().toISOString(),
                customer_id: customerId
            })
            .select('id')
            .single();

        // Generate and store embedding for outbound message (async, don't block)
        if (text && customerId && insertedOutbound?.id) {
            storeMessageEmbedding(insertedOutbound.id, customerId, config.user_id, text, 'assistant')
                .catch(err => console.error('Failed to store outbound embedding:', err.message));
        }

        return waMessageId;
    } catch (error) {
        console.error('Failed to send WhatsApp reply:', error.response?.data || error.message);
        throw error;
    }
}

// Handle message status updates (sent, delivered, read)
async function handleMessageStatus(config, value) {
    const statuses = value.statuses || [];

    for (const status of statuses) {
        const updateData = {
            status: status.status
        };

        if (status.status === 'delivered') {
            updateData.delivered_at = new Date(parseInt(status.timestamp) * 1000).toISOString();
        } else if (status.status === 'read') {
            updateData.read_at = new Date(parseInt(status.timestamp) * 1000).toISOString();
        }

        await supabase
            .from('whatsapp_messages')
            .update(updateData)
            .eq('wa_message_id', status.id);

        console.log('Updated message status:', status.id, status.status);
    }
}

// Handle WhatsApp call events
async function handleCallEvents(config, value) {
    const calls = value.calls || [];

    for (const call of calls) {
        // Upsert call record
        await supabase
            .from('whatsapp_calls')
            .upsert({
                wa_call_id: call.id,
                config_id: config.id,
                from_number: '+' + call.from,
                to_number: '+' + call.to,
                direction: call.direction || 'inbound',
                status: call.status,
                started_at: call.timestamp ? new Date(parseInt(call.timestamp) * 1000).toISOString() : null,
                duration_seconds: call.duration
            }, { onConflict: 'config_id,wa_call_id' });

        console.log('Processed call event:', call.id, call.status);
    }
}

app.get('/test-db', async (req, res) => {
  try {
    // Just check if we can connect. Querying a table that might be empty is fine.
    // We'll query 'voices' table, limit 1.
    const { data, error } = await supabase.from('voices').select('*').limit(1);
    
    if (error) {
        console.error('Supabase error:', error);
        throw error;
    }
    
    res.json({ message: 'Database connection successful', data });
  } catch (error) {
    console.error('Catch error:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

// ============================================
// PAYMENT ENDPOINTS - Stripe & Razorpay
// ============================================

// Initialize Stripe
let stripe = null;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (STRIPE_SECRET_KEY) {
    stripe = require('stripe')(STRIPE_SECRET_KEY);
    console.log('✅ Stripe initialized');
} else {
    console.warn('⚠️ STRIPE_SECRET_KEY not set - Stripe payments disabled');
}

// Razorpay Configuration
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
let razorpay = null;
if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
    const Razorpay = require('razorpay');
    razorpay = new Razorpay({
        key_id: RAZORPAY_KEY_ID,
        key_secret: RAZORPAY_KEY_SECRET
    });
    console.log('✅ Razorpay initialized');
} else {
    console.warn('⚠️ Razorpay credentials not set - Razorpay payments disabled');
}

// Credit Packages
const CREDIT_PACKAGES = {
    starter: { credits: 100, priceINR: 99, priceUSD: 1.20 },
    basic: { credits: 500, priceINR: 449, priceUSD: 5.40 },
    popular: { credits: 1000, priceINR: 799, priceUSD: 9.60 },
    pro: { credits: 2500, priceINR: 1799, priceUSD: 21.60 },
    business: { credits: 5000, priceINR: 3299, priceUSD: 39.60 },
    enterprise: { credits: 10000, priceINR: 5999, priceUSD: 72 }
};

/**
 * Create Stripe Payment Intent
 * POST /api/payments/stripe/create-intent
 */
app.post('/api/payments/stripe/create-intent', async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ error: 'Stripe not configured' });
        }

        const { userId, packageId, amount, currency, credits } = req.body;

        if (!userId || !packageId || !amount || !currency) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate package
        const pkg = CREDIT_PACKAGES[packageId];
        if (!pkg) {
            return res.status(400).json({ error: 'Invalid package' });
        }

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount, // Amount in cents
            currency: currency,
            metadata: {
                userId,
                packageId,
                credits: pkg.credits.toString()
            }
        });

        // Create pending transaction record
        await supabase
            .from('payment_transactions')
            .insert({
                user_id: userId,
                provider: 'stripe',
                provider_transaction_id: paymentIntent.id,
                amount: amount / 100,
                currency: currency.toUpperCase(),
                credits: pkg.credits,
                status: 'pending',
                metadata: { packageId }
            });

        console.log('Created Stripe payment intent:', paymentIntent.id);

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });

    } catch (error) {
        console.error('Stripe create intent error:', error);
        res.status(500).json({ error: error.message || 'Failed to create payment intent' });
    }
});

/**
 * Confirm Stripe Payment
 * POST /api/payments/stripe/confirm
 */
app.post('/api/payments/stripe/confirm', async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ error: 'Stripe not configured' });
        }

        const { userId, paymentIntentId } = req.body;

        if (!userId || !paymentIntentId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Retrieve payment intent to verify
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ error: 'Payment not completed' });
        }

        // Check if already processed
        const { data: existingTx } = await supabase
            .from('payment_transactions')
            .select('*')
            .eq('provider_transaction_id', paymentIntentId)
            .eq('status', 'completed')
            .single();

        if (existingTx) {
            return res.json({
                success: true,
                transactionId: existingTx.id,
                credits: existingTx.credits,
                message: 'Payment already processed'
            });
        }

        const credits = parseInt(paymentIntent.metadata.credits) || 0;

        // Add credits to user
        const { data: creditResult, error: creditError } = await supabase.rpc('add_credits', {
            p_user_id: userId,
            p_amount: credits,
            p_transaction_type: 'purchase',
            p_reference_id: paymentIntentId,
            p_description: `Credit purchase via Stripe - ${credits} credits`
        });

        if (creditError) {
            console.error('Failed to add credits:', creditError);
            return res.status(500).json({ error: 'Failed to add credits' });
        }

        // Update transaction status
        await supabase
            .from('payment_transactions')
            .update({ status: 'completed' })
            .eq('provider_transaction_id', paymentIntentId);

        console.log('Stripe payment confirmed:', paymentIntentId, 'Credits:', credits);

        res.json({
            success: true,
            transactionId: paymentIntentId,
            credits,
            newBalance: creditResult?.new_balance
        });

    } catch (error) {
        console.error('Stripe confirm error:', error);
        res.status(500).json({ error: error.message || 'Failed to confirm payment' });
    }
});

/**
 * Stripe Webhook Handler
 * POST /api/webhooks/stripe
 */
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ error: 'Stripe not configured' });
        }

        const sig = req.headers['stripe-signature'];
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

        let event;

        if (endpointSecret) {
            try {
                event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
            } catch (err) {
                console.error('Webhook signature verification failed:', err.message);
                return res.status(400).send(`Webhook Error: ${err.message}`);
            }
        } else {
            event = JSON.parse(req.body.toString());
        }

        // Handle the event
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                console.log('Payment succeeded:', paymentIntent.id);
                
                // Process the successful payment
                const userId = paymentIntent.metadata.userId;
                const credits = parseInt(paymentIntent.metadata.credits) || 0;

                if (userId && credits > 0) {
                    // Add credits
                    await supabase.rpc('add_credits', {
                        p_user_id: userId,
                        p_amount: credits,
                        p_transaction_type: 'purchase',
                        p_reference_id: paymentIntent.id,
                        p_description: `Credit purchase via Stripe - ${credits} credits`
                    });

                    // Update transaction status
                    await supabase
                        .from('payment_transactions')
                        .update({ status: 'completed' })
                        .eq('provider_transaction_id', paymentIntent.id);
                }
                break;

            case 'payment_intent.payment_failed':
                const failedIntent = event.data.object;
                console.log('Payment failed:', failedIntent.id);
                
                // Update transaction status
                await supabase
                    .from('payment_transactions')
                    .update({ 
                        status: 'failed',
                        metadata: { error: failedIntent.last_payment_error?.message }
                    })
                    .eq('provider_transaction_id', failedIntent.id);
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });

    } catch (error) {
        console.error('Stripe webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Create Razorpay Order
 * POST /api/payments/razorpay/create-order
 */
app.post('/api/payments/razorpay/create-order', async (req, res) => {
    try {
        if (!razorpay) {
            return res.status(503).json({ error: 'Razorpay not configured' });
        }

        const { userId, packageId, amount, credits } = req.body;

        if (!userId || !packageId || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate package
        const pkg = CREDIT_PACKAGES[packageId];
        if (!pkg) {
            return res.status(400).json({ error: 'Invalid package' });
        }

        // Create Razorpay order
        const order = await razorpay.orders.create({
            amount: amount, // Amount in paise
            currency: 'INR',
            receipt: `credit_${packageId}_${Date.now()}`,
            notes: {
                userId,
                packageId,
                credits: pkg.credits.toString()
            }
        });

        // Create pending transaction record
        await supabase
            .from('payment_transactions')
            .insert({
                user_id: userId,
                provider: 'razorpay',
                provider_transaction_id: order.id,
                amount: amount / 100, // Convert paise to rupees
                currency: 'INR',
                credits: pkg.credits,
                status: 'pending',
                metadata: { packageId }
            });

        console.log('Created Razorpay order:', order.id);

        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency
        });

    } catch (error) {
        console.error('Razorpay create order error:', error);
        res.status(500).json({ error: error.message || 'Failed to create order' });
    }
});

/**
 * Verify Razorpay Payment
 * POST /api/payments/razorpay/verify
 */
app.post('/api/payments/razorpay/verify', async (req, res) => {
    try {
        if (!razorpay) {
            return res.status(503).json({ error: 'Razorpay not configured' });
        }

        const { userId, orderId, paymentId, signature, credits } = req.body;

        if (!userId || !orderId || !paymentId || !signature) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Verify signature
        const crypto = require('crypto');
        const generatedSignature = crypto
            .createHmac('sha256', RAZORPAY_KEY_SECRET)
            .update(`${orderId}|${paymentId}`)
            .digest('hex');

        if (generatedSignature !== signature) {
            console.error('Razorpay signature mismatch');
            return res.status(400).json({ error: 'Invalid payment signature' });
        }

        // Check if already processed
        const { data: existingTx } = await supabase
            .from('payment_transactions')
            .select('*')
            .eq('provider_transaction_id', orderId)
            .eq('status', 'completed')
            .single();

        if (existingTx) {
            return res.json({
                success: true,
                transactionId: paymentId,
                credits: existingTx.credits,
                message: 'Payment already processed'
            });
        }

        // Fetch order details to get credits
        const order = await razorpay.orders.fetch(orderId);
        const actualCredits = parseInt(order.notes?.credits) || credits || 0;

        // Add credits to user
        const { data: creditResult, error: creditError } = await supabase.rpc('add_credits', {
            p_user_id: userId,
            p_amount: actualCredits,
            p_transaction_type: 'purchase',
            p_reference_id: paymentId,
            p_description: `Credit purchase via Razorpay - ${actualCredits} credits`
        });

        if (creditError) {
            console.error('Failed to add credits:', creditError);
            return res.status(500).json({ error: 'Failed to add credits' });
        }

        // Update transaction status
        await supabase
            .from('payment_transactions')
            .update({ 
                status: 'completed',
                provider_transaction_id: paymentId, // Update to payment ID
                metadata: { orderId, paymentId }
            })
            .eq('provider_transaction_id', orderId);

        console.log('Razorpay payment verified:', paymentId, 'Credits:', actualCredits);

        res.json({
            success: true,
            transactionId: paymentId,
            credits: actualCredits,
            newBalance: creditResult?.new_balance
        });

    } catch (error) {
        console.error('Razorpay verify error:', error);
        res.status(500).json({ error: error.message || 'Failed to verify payment' });
    }
});

/**
 * Razorpay Webhook Handler
 * POST /api/webhooks/razorpay
 */
app.post('/api/webhooks/razorpay', async (req, res) => {
    try {
        if (!razorpay) {
            return res.status(503).json({ error: 'Razorpay not configured' });
        }

        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        
        if (webhookSecret) {
            const crypto = require('crypto');
            const signature = req.headers['x-razorpay-signature'];
            const generatedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(JSON.stringify(req.body))
                .digest('hex');

            if (signature !== generatedSignature) {
                console.error('Razorpay webhook signature mismatch');
                return res.status(400).json({ error: 'Invalid signature' });
            }
        }

        const event = req.body;
        console.log('Razorpay webhook:', event.event);

        switch (event.event) {
            case 'payment.captured':
                const payment = event.payload.payment.entity;
                const order = event.payload.order?.entity;
                
                console.log('Payment captured:', payment.id);
                
                if (order?.notes?.userId) {
                    const userId = order.notes.userId;
                    const credits = parseInt(order.notes.credits) || 0;

                    // Check if already processed
                    const { data: existingTx } = await supabase
                        .from('payment_transactions')
                        .select('status')
                        .eq('provider_transaction_id', order.id)
                        .single();

                    if (existingTx?.status !== 'completed') {
                        // Add credits
                        await supabase.rpc('add_credits', {
                            p_user_id: userId,
                            p_amount: credits,
                            p_transaction_type: 'purchase',
                            p_reference_id: payment.id,
                            p_description: `Credit purchase via Razorpay - ${credits} credits`
                        });

                        // Update transaction status
                        await supabase
                            .from('payment_transactions')
                            .update({ 
                                status: 'completed',
                                provider_transaction_id: payment.id
                            })
                            .eq('provider_transaction_id', order.id);
                    }
                }
                break;

            case 'payment.failed':
                const failedPayment = event.payload.payment.entity;
                console.log('Payment failed:', failedPayment.id);
                
                await supabase
                    .from('payment_transactions')
                    .update({ 
                        status: 'failed',
                        metadata: { error: failedPayment.error_description }
                    })
                    .eq('provider_transaction_id', failedPayment.order_id);
                break;

            default:
                console.log(`Unhandled Razorpay event: ${event.event}`);
        }

        res.json({ received: true });

    } catch (error) {
        console.error('Razorpay webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get payment status
 * GET /api/payments/status/:transactionId
 */
app.get('/api/payments/status/:transactionId', async (req, res) => {
    try {
        const { transactionId } = req.params;

        const { data, error } = await supabase
            .from('payment_transactions')
            .select('*')
            .eq('provider_transaction_id', transactionId)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.json(data);

    } catch (error) {
        console.error('Get payment status error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// COUPON MANAGEMENT ENDPOINTS
// ============================================

/**
 * Redeem a coupon code
 * POST /api/coupons/redeem
 */
app.post('/api/coupons/redeem', async (req, res) => {
    try {
        const { couponCode, userId } = req.body;

        if (!couponCode || !userId) {
            return res.status(400).json({ error: 'Coupon code and user ID are required' });
        }

        const { data, error } = await supabase.rpc('redeem_coupon', {
            p_user_id: userId,
            p_coupon_code: couponCode
        });

        if (error) {
            console.error('Coupon redemption error:', error);
            return res.status(400).json({ error: error.message });
        }

        if (!data.success) {
            return res.status(400).json({ error: data.error });
        }

        res.json(data);

    } catch (error) {
        console.error('Redeem coupon error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Apply welcome bonus to new user
 * POST /api/coupons/welcome-bonus
 */
app.post('/api/coupons/welcome-bonus', async (req, res) => {
    try {
        const { userId, ipAddress, userAgent } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const { data, error } = await supabase.rpc('apply_welcome_bonus', {
            p_user_id: userId,
            p_ip_address: ipAddress || req.ip,
            p_user_agent: userAgent || req.get('User-Agent')
        });

        if (error) {
            console.error('Welcome bonus error:', error);
            return res.status(400).json({ error: error.message });
        }

        res.json(data);

    } catch (error) {
        console.error('Apply welcome bonus error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Create bulk promo coupons (Admin only)
 * POST /api/coupons/generate-bulk
 */
app.post('/api/coupons/generate-bulk', async (req, res) => {
    try {
        const { 
            creatorId,
            count = 10, 
            creditAmount = 500, 
            prefix = 'PROMO',
            validDays = 90,
            newUserOnly = false,
            maxUsesPerCoupon = 1,
            description = null
        } = req.body;

        if (!creatorId) {
            return res.status(400).json({ error: 'Creator ID is required' });
        }

        if (count > 100) {
            return res.status(400).json({ error: 'Maximum 100 coupons per batch' });
        }

        const { data, error } = await supabase.rpc('create_promo_coupons', {
            p_creator_id: creatorId,
            p_count: count,
            p_credit_amount: creditAmount,
            p_prefix: prefix,
            p_valid_days: validDays,
            p_new_user_only: newUserOnly,
            p_max_uses_per_coupon: maxUsesPerCoupon,
            p_description: description
        });

        if (error) {
            console.error('Bulk coupon generation error:', error);
            return res.status(400).json({ error: error.message });
        }

        res.json(data);

    } catch (error) {
        console.error('Generate bulk coupons error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get all coupons (Admin)
 * GET /api/coupons
 */
app.get('/api/coupons', async (req, res) => {
    try {
        const { type, active, limit = 50, offset = 0 } = req.query;

        let query = supabase
            .from('coupons')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (type) {
            query = query.eq('coupon_type', type);
        }

        if (active !== undefined) {
            query = query.eq('is_active', active === 'true');
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('Get coupons error:', error);
            return res.status(400).json({ error: error.message });
        }

        res.json({ coupons: data, total: count });

    } catch (error) {
        console.error('Get coupons error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get coupon usage statistics
 * GET /api/coupons/:couponId/stats
 */
app.get('/api/coupons/:couponId/stats', async (req, res) => {
    try {
        const { couponId } = req.params;

        // Get coupon details
        const { data: coupon, error: couponError } = await supabase
            .from('coupons')
            .select('*')
            .eq('id', couponId)
            .single();

        if (couponError || !coupon) {
            return res.status(404).json({ error: 'Coupon not found' });
        }

        // Get usage history
        const { data: usage, error: usageError } = await supabase
            .from('coupon_usage')
            .select('*, user_profiles(full_name, email)')
            .eq('coupon_id', couponId)
            .order('used_at', { ascending: false });

        if (usageError) {
            console.error('Get coupon usage error:', usageError);
        }

        // Calculate stats
        const totalRedemptions = usage?.length || 0;
        const totalCreditsGiven = usage?.reduce((sum, u) => sum + (u.discount_applied || 0), 0) || 0;

        res.json({
            coupon,
            stats: {
                totalRedemptions,
                totalCreditsGiven,
                remainingUses: coupon.max_uses ? coupon.max_uses - coupon.current_uses : 'Unlimited',
                isActive: coupon.is_active && new Date(coupon.valid_until) > new Date()
            },
            recentUsage: usage?.slice(0, 20) || []
        });

    } catch (error) {
        console.error('Get coupon stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Create single coupon (Admin)
 * POST /api/coupons/create
 */
app.post('/api/coupons/create', async (req, res) => {
    try {
        const {
            code,
            couponType = 'promo',
            creditAmount = 0,
            discountPercent = 0,
            discountAmount = 0,
            maxDiscount = null,
            minPurchase = null,
            maxUses = null,
            validDays = 90,
            newUserOnly = false,
            autoApplyOnSignup = false,
            description = null,
            creatorId
        } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Coupon code is required' });
        }

        const { data, error } = await supabase
            .from('coupons')
            .insert({
                code: code.toUpperCase(),
                coupon_type: couponType,
                credit_amount: creditAmount,
                discount_percent: discountPercent,
                discount_amount: discountAmount,
                max_discount: maxDiscount,
                min_purchase: minPurchase,
                max_uses: maxUses,
                valid_until: new Date(Date.now() + validDays * 24 * 60 * 60 * 1000),
                new_user_only: newUserOnly,
                auto_apply_on_signup: autoApplyOnSignup,
                description,
                created_by: creatorId,
                is_active: true
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({ error: 'Coupon code already exists' });
            }
            console.error('Create coupon error:', error);
            return res.status(400).json({ error: error.message });
        }

        res.json(data);

    } catch (error) {
        console.error('Create coupon error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Update coupon status (Admin)
 * PATCH /api/coupons/:couponId
 */
app.patch('/api/coupons/:couponId', async (req, res) => {
    try {
        const { couponId } = req.params;
        const { isActive, maxUses, validUntil, description } = req.body;

        const updates = {};
        if (isActive !== undefined) updates.is_active = isActive;
        if (maxUses !== undefined) updates.max_uses = maxUses;
        if (validUntil !== undefined) updates.valid_until = validUntil;
        if (description !== undefined) updates.description = description;

        const { data, error } = await supabase
            .from('coupons')
            .update(updates)
            .eq('id', couponId)
            .select()
            .single();

        if (error) {
            console.error('Update coupon error:', error);
            return res.status(400).json({ error: error.message });
        }

        res.json(data);

    } catch (error) {
        console.error('Update coupon error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Delete coupon (Admin)
 * DELETE /api/coupons/:couponId
 */
app.delete('/api/coupons/:couponId', async (req, res) => {
    try {
        const { couponId } = req.params;

        const { error } = await supabase
            .from('coupons')
            .delete()
            .eq('id', couponId);

        if (error) {
            console.error('Delete coupon error:', error);
            return res.status(400).json({ error: error.message });
        }

        res.json({ success: true, message: 'Coupon deleted' });

    } catch (error) {
        console.error('Delete coupon error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Get welcome bonus status for a user
 * GET /api/coupons/welcome-bonus/:userId
 */
app.get('/api/coupons/welcome-bonus/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const { data, error } = await supabase
            .from('welcome_bonus_claims')
            .select('*, coupons(code, description)')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Get welcome bonus status error:', error);
            return res.status(400).json({ error: error.message });
        }

        if (!data) {
            // Check if there's an available bonus
            const { data: availableBonus } = await supabase
                .from('coupons')
                .select('code, credit_amount, description')
                .eq('coupon_type', 'signup_bonus')
                .eq('auto_apply_on_signup', true)
                .eq('is_active', true)
                .gt('valid_until', new Date().toISOString())
                .single();

            return res.json({
                claimed: false,
                availableBonus: availableBonus || null
            });
        }

        res.json({
            claimed: true,
            claimDetails: data
        });

    } catch (error) {
        console.error('Get welcome bonus status error:', error);
        res.status(500).json({ error: error.message });
    }
});

// =====================================
// ADMIN ENDPOINTS (Protected by passkey)
// =====================================

const ADMIN_PASSKEY = process.env.ADMIN_PASSKEY || 'voicory2024admin';

/**
 * Middleware to verify admin passkey
 */
const verifyAdminPasskey = (req, res, next) => {
    const passkey = req.headers['x-admin-passkey'];
    if (!passkey || passkey !== ADMIN_PASSKEY) {
        return res.status(401).json({ error: 'Unauthorized: Invalid admin passkey' });
    }
    next();
};

/**
 * Admin: Adjust user credits
 * POST /api/admin/adjust-credits
 */
app.post('/api/admin/adjust-credits', verifyAdminPasskey, async (req, res) => {
    try {
        const { userId, amount, reason } = req.body;

        if (!userId || amount === undefined || !reason) {
            return res.status(400).json({ error: 'userId, amount, and reason are required' });
        }

        // Get current balance
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('credits_balance, organization_email')
            .eq('user_id', userId)
            .single();

        if (profileError || !profile) {
            return res.status(404).json({ error: 'User not found' });
        }

        const balanceBefore = Number(profile.credits_balance) || 0;
        const balanceAfter = balanceBefore + Number(amount);

        // Update balance
        const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ credits_balance: balanceAfter })
            .eq('user_id', userId);

        if (updateError) {
            console.error('Admin credit adjustment failed:', updateError);
            return res.status(400).json({ error: updateError.message });
        }

        // Log transaction
        const { error: transactionError } = await supabase
            .from('credit_transactions')
            .insert({
                user_id: userId,
                transaction_type: amount >= 0 ? 'bonus' : 'usage',
                amount: amount,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                description: `Admin adjustment: ${reason}`,
                reference_type: 'admin_adjustment',
            });

        if (transactionError) {
            console.error('Failed to log admin transaction:', transactionError);
        }

        console.log(`Admin credit adjustment: User ${profile.organization_email}, Amount: ${amount}, Reason: ${reason}`);

        res.json({
            success: true,
            message: `Credits adjusted by ₹${amount}`,
            newBalance: balanceAfter,
        });

    } catch (error) {
        console.error('Admin adjust credits error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Admin: Suspend/Unsuspend user
 * POST /api/admin/user/:userId/status
 */
app.post('/api/admin/user/:userId/status', verifyAdminPasskey, async (req, res) => {
    try {
        const { userId } = req.params;
        const { status, reason } = req.body;

        if (!status || !['active', 'suspended', 'banned'].includes(status)) {
            return res.status(400).json({ error: 'Valid status (active, suspended, banned) is required' });
        }

        const { error } = await supabase
            .from('user_profiles')
            .update({ 
                account_status: status,
                status_reason: reason,
                status_updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

        if (error) {
            console.error('Admin user status update failed:', error);
            return res.status(400).json({ error: error.message });
        }

        console.log(`Admin updated user ${userId} status to ${status}. Reason: ${reason}`);

        res.json({
            success: true,
            message: `User status updated to ${status}`,
        });

    } catch (error) {
        console.error('Admin user status error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Admin: Get system stats
 * GET /api/admin/stats
 */
app.get('/api/admin/stats', verifyAdminPasskey, async (req, res) => {
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

        const [
            { count: totalUsers },
            { count: newUsersToday },
            { data: transactions },
            { count: totalAssistants },
            { count: totalPhoneNumbers },
        ] = await Promise.all([
            supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
            supabase.from('user_profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
            supabase.from('credit_transactions').select('amount').eq('transaction_type', 'purchase'),
            supabase.from('assistants').select('*', { count: 'exact', head: true }),
            supabase.from('phone_numbers').select('*', { count: 'exact', head: true }),
        ]);

        const totalRevenue = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        res.json({
            totalUsers: totalUsers || 0,
            newUsersToday: newUsersToday || 0,
            totalRevenue,
            totalAssistants: totalAssistants || 0,
            totalPhoneNumbers: totalPhoneNumbers || 0,
        });

    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

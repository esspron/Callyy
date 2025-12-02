// ============================================
// HEALTH ROUTES
// ============================================
const express = require('express');
const router = express.Router();
const { getRedis } = require('../services/cache');
const { searchKnowledgeBase, formatRAGContext } = require('../services/rag');

// Basic status
router.get('/', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Voicory Backend',
        timestamp: new Date().toISOString()
    });
});

// Detailed health check
router.get('/health', async (req, res) => {
    const redis = getRedis();
    let redisStatus = 'not configured';
    let redisLatency = null;
    let redisMode = null;
    
    if (redis) {
        try {
            const start = Date.now();
            await redis.ping();
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

// Debug RAG endpoint - DISABLED IN PRODUCTION
// Only available in development mode
if (process.env.NODE_ENV !== 'production') {
    router.get('/debug-rag', async (req, res) => {
        const { query, kbId } = req.query;
        
        if (!query || !kbId) {
            return res.status(400).json({ 
                error: 'Missing query or kbId parameter',
                usage: '/debug-rag?query=what is the pricing&kbId=uuid'
            });
        }
        
        try {
            console.log('[DEBUG-RAG] Testing search with:', { query, kbId });
            const results = await searchKnowledgeBase(query, [kbId], 0.3, 5);
            
            res.json({
                success: true,
                query,
                kbId,
                resultsCount: results.length,
                results: results.map(r => ({
                    name: r.name,
                    similarity: r.similarity,
                    contentPreview: r.content?.slice(0, 200) + '...'
                })),
                formattedContext: results.length > 0 ? formatRAGContext(results) : 'No results'
            });
        } catch (error) {
            console.error('[DEBUG-RAG] Error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });
}

module.exports = router;

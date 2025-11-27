
export interface Metric {
    label: string;
    value: string | number;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
    icon?: any;
}

// ============================================
// VOICE TYPES
// ============================================

export interface Voice {
    id: string;
    name: string;
    description?: string;
    gender: 'Male' | 'Female' | 'Neutral';
    
    // ElevenLabs reference (for actual TTS during calls)
    elevenlabsVoiceId: string;
    elevenlabsModelId: string;
    
    // Categorization
    accent: string;
    primaryLanguage: string;
    supportedLanguages: string[];
    tags: string[];
    
    // Voice settings defaults
    defaultStability: number;
    defaultSimilarity: number;
    defaultStyle: number;
    
    // Pricing (INR per minute)
    costPerMin: number;
    
    // Status
    isActive: boolean;
    isFeatured: boolean;
    isPremium: boolean;
    displayOrder: number;
    
    // Audio preview URL from ElevenLabs
    previewUrl?: string;
    
    // Timestamps
    createdAt?: string;
    updatedAt?: string;
    
    // Joined data (optional)
    samples?: VoiceSample[];
}

export interface VoiceSample {
    id: string;
    voiceId: string;
    language: string;
    sampleText?: string;
    audioUrl: string;
    durationSeconds?: number;
    createdAt?: string;
}

// Voice with samples loaded
export interface VoiceWithSamples extends Voice {
    samples: VoiceSample[];
}

export interface Assistant {
    id: string;
    name: string;
    model: string;
    voiceId?: string;
    transcriber: string;
    createdAt: string;
    updatedAt?: string;
    status: 'active' | 'inactive' | 'draft';
    
    // Agent Configuration
    systemPrompt?: string;
    firstMessage?: string;
    
    // Voice Settings
    elevenlabsModelId?: string;  // 'eleven_multilingual_v2' | 'eleven_turbo_v2_5' | 'eleven_flash_v2_5'
    language?: string;           // ISO language code (en, hi, ta, etc.)
    
    // LLM Settings
    llmProvider?: string;        // 'openai' | 'anthropic' | 'groq' | 'together'
    llmModel?: string;           // e.g. 'gpt-4o', 'claude-3.5-sonnet', etc.
    temperature?: number;        // 0.0 to 1.0
    maxTokens?: number;
    
    // Behavior Settings
    interruptible?: boolean;
    useDefaultPersonality?: boolean;
    timezone?: string;
    
    // RAG Settings
    ragEnabled?: boolean;
    ragSimilarityThreshold?: number;
    ragMaxResults?: number;
    ragInstructions?: string;
    knowledgeBaseIds?: string[];
    
    // Memory Settings (Customer Memory System)
    memoryEnabled?: boolean;
    memoryConfig?: MemoryConfig;
}

// Input type for creating/updating assistants
export interface AssistantInput {
    name: string;
    systemPrompt?: string;
    firstMessage?: string;
    voiceId?: string;
    elevenlabsModelId?: string;
    language?: string;
    llmProvider?: string;
    llmModel?: string;
    temperature?: number;
    maxTokens?: number;
    interruptible?: boolean;
    useDefaultPersonality?: boolean;
    timezone?: string;
    ragEnabled?: boolean;
    ragSimilarityThreshold?: number;
    ragMaxResults?: number;
    ragInstructions?: string;
    knowledgeBaseIds?: string[];
    memoryEnabled?: boolean;
    memoryConfig?: MemoryConfig;
    status?: 'active' | 'inactive' | 'draft';
}

export interface AssistantTool {
    id: string;
    assistantId: string;
    toolType: 'function' | 'webhook' | 'transfer' | 'dtmf' | 'end_call';
    name: string;
    description?: string;
    config: Record<string, any>;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface PhoneNumber {
    id: string;
    number: string;
    provider: 'Callyy' | 'CallyySIP' | 'Twilio' | 'Vonage' | 'Telnyx' | 'BYOSIP';
    assistantId?: string;
    label?: string;
    
    // Common fields
    inboundEnabled?: boolean;
    outboundEnabled?: boolean;
    isActive?: boolean;
    
    // Free Callyy Number fields
    areaCode?: string;
    
    // Free Callyy SIP fields
    sipIdentifier?: string;
    sipLabel?: string;
    sipUsername?: string;
    sipPassword?: string;
    
    // Twilio Import fields
    twilioPhoneNumber?: string;
    twilioAccountSid?: string;
    twilioAuthToken?: string;
    smsEnabled?: boolean;
    
    // Vonage Import fields
    vonagePhoneNumber?: string;
    vonageApiKey?: string;
    vonageApiSecret?: string;
    
    // Telnyx Import fields
    telnyxPhoneNumber?: string;
    telnyxApiKey?: string;
    
    // BYO SIP Trunk fields
    sipTrunkPhoneNumber?: string;
    sipTrunkCredentialId?: string;
    allowNonE164?: boolean;
}

export interface SipTrunkCredential {
    id: string;
    name: string;
    sipTrunkUri: string;
    username?: string;
    password?: string;
    createdAt: string;
}

export interface ApiKey {
    id: string;
    label: string;
    key: string; // partial display
    type: 'public' | 'private';
    createdAt: string;
}

export interface CallLog {
    id: string;
    assistantName: string;
    phoneNumber: string;
    duration: string;
    cost: number;
    status: 'completed' | 'failed' | 'ongoing';
    date: string;
}

export interface Customer {
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
    variables: Record<string, string>; // Context variables for the bot
    createdAt: string;
    // Memory fields
    hasMemory?: boolean;
    lastInteraction?: string;
    interactionCount?: number;
}

// ============================================
// CUSTOMER MEMORY TYPES
// ============================================

export interface CustomerConversation {
    id: string;
    customerId: string;
    assistantId?: string;
    callLogId?: string;
    
    // Call metadata
    callDirection: 'inbound' | 'outbound';
    startedAt: string;
    endedAt?: string;
    durationSeconds?: number;
    
    // Transcript
    transcript: TranscriptMessage[];
    
    // AI Analysis
    summary?: string;
    keyPoints?: string[];
    sentiment?: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
    sentimentScore?: number;
    topicsDiscussed?: string[];
    
    // Action Items
    actionItems: ActionItem[];
    followUpRequired?: boolean;
    followUpDate?: string;
    followUpReason?: string;
    
    // Outcome
    outcome?: 'successful' | 'callback_requested' | 'not_interested' | 'wrong_number' | 'voicemail' | 'no_answer' | 'other';
    outcomeNotes?: string;
    
    createdAt: string;
    updatedAt?: string;
}

export interface TranscriptMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

export interface ActionItem {
    task: string;
    dueDate?: string;
    priority: 'high' | 'medium' | 'low';
    completed: boolean;
}

export interface CustomerMemory {
    id: string;
    customerId: string;
    
    // Relationship Overview
    totalConversations: number;
    totalCallDurationMinutes: number;
    firstContactDate?: string;
    lastContactDate?: string;
    averageSentiment?: number;
    
    // AI-Generated Profile
    personalityTraits?: string[];
    communicationPreferences?: {
        preferredTime?: string;
        preferredLanguage?: string;
        communicationStyle?: string;
    };
    interests?: string[];
    painPoints?: string[];
    
    // Important Information
    importantDates?: ImportantDate[];
    familyInfo?: Record<string, any>;
    professionalInfo?: {
        company?: string;
        role?: string;
        industry?: string;
    };
    
    // Preferences & History
    productInterests?: string[];
    pastPurchases?: PastPurchase[];
    objectionsRaised?: string[];
    
    // Engagement Metrics
    engagementScore: number;
    lifetimeValue?: number;
    churnRisk?: 'low' | 'medium' | 'high';
    
    // Summary
    executiveSummary?: string;
    conversationContext?: string;
    
    createdAt: string;
    updatedAt?: string;
}

export interface ImportantDate {
    date: string;
    description: string;
    type: 'birthday' | 'anniversary' | 'renewal' | 'custom';
}

export interface PastPurchase {
    product: string;
    date: string;
    amount: number;
}

export interface CustomerInsight {
    id: string;
    customerId: string;
    conversationId?: string;
    
    insightType: 'preference' | 'objection' | 'interest' | 'personal_info' | 'pain_point' | 'opportunity' | 'commitment' | 'feedback' | 'custom';
    category?: string;
    content: string;
    importance: 'low' | 'medium' | 'high' | 'critical';
    
    sourceQuote?: string;
    confidence?: number;
    
    isActive: boolean;
    verifiedByUser: boolean;
    
    extractedAt: string;
    createdAt: string;
}

export interface MemoryConfig {
    rememberConversations: boolean;
    extractInsights: boolean;
    trackSentiment: boolean;
    maxContextConversations: number;
    includeSummary: boolean;
    includeInsights: boolean;
    includeActionItems: boolean;
    autoGenerateSummary: boolean;
}

// Customer context returned by get_customer_context function
export interface CustomerContext {
    customer: {
        id: string;
        name: string;
        email: string;
        phone: string;
        variables: Record<string, string>;
    };
    memory?: {
        totalConversations: number;
        firstContact?: string;
        lastContact?: string;
        averageSentiment?: number;
        personalityTraits?: string[];
        interests?: string[];
        painPoints?: string[];
        engagementScore?: number;
        executiveSummary?: string;
        conversationContext?: string;
    };
    recentConversations: Array<{
        startedAt: string;
        summary?: string;
        keyPoints?: string[];
        sentiment?: string;
        outcome?: string;
        actionItems?: ActionItem[];
    }>;
    keyInsights: Array<{
        insightType: string;
        category?: string;
        content: string;
        importance: string;
    }>;
}

export interface UserProfile {
    id: string;
    userId: string;
    organizationName: string;
    organizationEmail: string;
    walletId: string;
    channel: string;
    callConcurrencyLimit: number;
    hipaaEnabled: boolean;
    creditsBalance: number;
    planType: 'PAYG' | 'Starter' | 'Pro' | 'Enterprise';
    createdAt: string;
    updatedAt: string;
}

// ============================================
// WHATSAPP BUSINESS API TYPES
// ============================================

export interface WhatsAppConfig {
    id: string;
    userId: string;
    
    // WhatsApp Business Account Info
    wabaId: string;                    // WhatsApp Business Account ID
    phoneNumberId: string;             // Business Phone Number ID
    displayPhoneNumber: string;        // Formatted phone number for display
    displayName: string;               // Business display name
    
    // Facebook/Meta App Credentials
    accessToken: string;               // Encrypted access token
    appId?: string;                    // Facebook App ID
    
    // Webhook Configuration
    webhookVerifyToken: string;        // Token for webhook verification
    webhookUrl?: string;               // The configured webhook URL
    
    // Status
    status: 'pending' | 'connected' | 'disconnected' | 'error';
    qualityRating?: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
    messagingLimit?: number;
    
    // Features Enabled
    callingEnabled: boolean;           // WhatsApp Calling enabled
    chatbotEnabled: boolean;           // Chatbot/Auto-reply enabled
    
    // Calling Settings
    callSettings?: WhatsAppCallSettings;
    
    // Chatbot Configuration
    assistantId?: string;              // Connected AI assistant for auto-replies
    
    // Timestamps
    createdAt: string;
    updatedAt: string;
    lastSyncedAt?: string;
}

export interface WhatsAppCallSettings {
    inboundCallsEnabled: boolean;      // Accept incoming calls
    outboundCallsEnabled: boolean;     // Can make outbound calls
    businessHours?: BusinessHours;     // When calls are accepted
    callbackRequestEnabled: boolean;   // Allow users to request callback
    callPermissionTemplate?: string;   // Template for call permission request
}

export interface BusinessHours {
    timezone: string;
    schedule: {
        day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
        enabled: boolean;
        startTime: string;  // HH:MM format
        endTime: string;    // HH:MM format
    }[];
}

export interface WhatsAppMessage {
    id: string;
    waMessageId: string;               // WhatsApp message ID
    configId: string;                  // Reference to WhatsAppConfig
    
    // Participants
    fromNumber: string;
    toNumber: string;
    direction: 'inbound' | 'outbound';
    
    // Message Content
    type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'location' | 'contacts' | 'interactive' | 'template' | 'reaction';
    content: WhatsAppMessageContent;
    
    // Status
    status: 'sent' | 'delivered' | 'read' | 'failed' | 'received';
    errorCode?: string;
    errorMessage?: string;
    
    // Context (for replies)
    contextMessageId?: string;
    
    // AI Processing
    isFromBot: boolean;
    assistantId?: string;
    
    // Timestamps
    timestamp: string;
    deliveredAt?: string;
    readAt?: string;
    createdAt: string;
}

export interface WhatsAppMessageContent {
    // Text messages
    body?: string;
    previewUrl?: boolean;
    
    // Media messages
    mediaId?: string;
    mediaUrl?: string;
    mimeType?: string;
    caption?: string;
    filename?: string;
    
    // Location messages
    latitude?: number;
    longitude?: number;
    name?: string;
    address?: string;
    
    // Interactive messages
    interactive?: {
        type: 'list' | 'button' | 'product' | 'product_list' | 'flow' | 'cta_url';
        header?: any;
        body?: any;
        footer?: any;
        action?: any;
    };
    
    // Template messages
    template?: {
        name: string;
        language: { code: string };
        components?: any[];
    };
    
    // Reaction
    emoji?: string;
    reactToMessageId?: string;
}

export interface WhatsAppCall {
    id: string;
    waCallId: string;                  // WhatsApp call ID
    configId: string;                  // Reference to WhatsAppConfig
    
    // Participants
    fromNumber: string;
    toNumber: string;
    direction: 'inbound' | 'outbound';
    
    // Call Status
    status: 'ringing' | 'in_progress' | 'completed' | 'missed' | 'rejected' | 'busy' | 'failed';
    
    // Duration
    startedAt?: string;
    connectedAt?: string;
    endedAt?: string;
    durationSeconds?: number;
    
    // AI Integration
    handledByBot: boolean;
    assistantId?: string;
    transcript?: TranscriptMessage[];
    
    // Callback Request
    callbackRequested?: boolean;
    callbackScheduledAt?: string;
    
    // Timestamps
    createdAt: string;
    updatedAt?: string;
}

export interface WhatsAppContact {
    id: string;
    configId: string;
    
    // Contact Info
    waId: string;                      // WhatsApp ID (phone number)
    profileName?: string;              // WhatsApp profile name
    phoneNumber: string;
    
    // Customer Link
    customerId?: string;               // Link to Customer table
    
    // Conversation State
    isOptedIn: boolean;
    lastMessageAt?: string;
    conversationWindowOpen: boolean;   // 24-hour window status
    windowExpiresAt?: string;
    
    // Calling Permission
    callingPermissionGranted: boolean;
    callingPermissionRequestedAt?: string;
    
    // Stats
    totalMessages: number;
    totalCalls: number;
    
    // Timestamps
    createdAt: string;
    updatedAt?: string;
}

export interface WhatsAppTemplate {
    id: string;
    configId: string;
    
    // Template Info
    name: string;
    language: string;
    category: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
    status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'DISABLED';
    
    // Template Structure
    components: WhatsAppTemplateComponent[];
    
    // Meta Info
    qualityScore?: string;
    
    // Timestamps
    createdAt: string;
    updatedAt?: string;
}

export interface WhatsAppTemplateComponent {
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
    format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    text?: string;
    example?: any;
    buttons?: {
        type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE' | 'FLOW';
        text: string;
        url?: string;
        phoneNumber?: string;
    }[];
}

// Input types for API calls
export interface SendWhatsAppMessageInput {
    configId: string;
    to: string;
    type: WhatsAppMessage['type'];
    content: Partial<WhatsAppMessageContent>;
    contextMessageId?: string;         // For reply messages
}

export interface InitiateWhatsAppCallInput {
    configId: string;
    to: string;
    assistantId?: string;              // Optional: Use AI assistant for the call
}

export interface WhatsAppWebhookPayload {
    object: string;
    entry: {
        id: string;
        changes: {
            value: {
                messaging_product: string;
                metadata: {
                    display_phone_number: string;
                    phone_number_id: string;
                };
                contacts?: Array<{
                    profile: { name: string };
                    wa_id: string;
                }>;
                messages?: Array<any>;
                statuses?: Array<any>;
                calls?: Array<any>;
            };
            field: string;
        }[];
    }[];
}

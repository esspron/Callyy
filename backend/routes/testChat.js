// ============================================
// TEST CHAT ROUTES - Dashboard Agent Testing
// ============================================
// Uses the centralized AssistantProcessor for all AI logic
// ============================================
const express = require('express');
const router = express.Router();
const { supabase } = require('../config');
const { processMessage } = require('../services/assistantProcessor');
const { getCachedAssistant } = require('../services/assistant');

// ============================================
// TEST CHAT ENDPOINT - For testing agents in the dashboard
// Now uses centralized AssistantProcessor (same as WhatsApp, SMS, etc.)
// ============================================
router.post('/test-chat', async (req, res) => {
    try {
        const { 
            message, 
            conversationHistory = [], 
            assistantId,
            assistantConfig,
            userId,
            channel = 'calls'
        } = req.body;

        // Validate required fields
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        if (!assistantId && !assistantConfig) {
            return res.status(400).json({ error: 'Either assistantId or assistantConfig is required' });
        }

        // Get billing user ID
        let billingUserId = userId;
        if (!billingUserId && assistantId) {
            const savedAssistant = await getCachedAssistant(assistantId);
            if (savedAssistant) {
                billingUserId = savedAssistant.user_id;
            }
        }

        if (!billingUserId) {
            return res.status(400).json({ error: 'userId is required for billing' });
        }

        // ===== USE CENTRALIZED PROCESSOR =====
        const result = await processMessage({
            message,
            assistantId,
            assistantConfig,
            conversationHistory,
            channel,
            customer: null, // Test chat doesn't have customer context
            memory: null,   // Test chat doesn't have memory context
            userId: billingUserId,
        });

        if (result.error) {
            console.error('Test chat error:', result.error);
            return res.status(500).json({ error: result.error });
        }

        // ===== BILLING: Deduct credits =====
        const { usage } = result;
        let cost = null;
        let balance = null;

        if (usage && billingUserId) {
            try {
                // Use the RPC function to log usage and deduct credits
                const { data: usageResult, error: usageError } = await supabase.rpc('log_llm_usage', {
                    p_user_id: billingUserId,
                    p_assistant_id: assistantId || null,
                    p_provider: 'openai',
                    p_model: usage.model,
                    p_input_tokens: usage.inputTokens,
                    p_output_tokens: usage.outputTokens,
                    p_call_log_id: null,
                    p_conversation_id: null
                });

                if (usageError) {
                    console.error('Failed to log test chat LLM usage:', usageError);
                } else {
                    cost = usageResult?.cost_inr;
                    balance = usageResult?.balance;
                    console.log(`Test chat billing: ${usage.totalTokens} tokens, cost: ${cost}`);
                }
            } catch (billingError) {
                console.error('Billing error (non-blocking):', billingError.message);
            }
        }

        // Return response with usage info
        res.json({
            response: result.response,
            usage: usage ? {
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
                totalTokens: usage.totalTokens,
                cost,
                balance,
            } : null,
        });

    } catch (error) {
        console.error('Test chat error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

module.exports = router;

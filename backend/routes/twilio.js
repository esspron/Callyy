// ============================================
// TWILIO ROUTES - Phone Number Import & Webhooks
// ============================================
const express = require('express');
const router = express.Router();
const { supabase, axios, encrypt, decrypt, validateBody, twilioImportSchema } = require('../config');
const { getCachedPhoneConfig, getCachedAssistant, invalidatePhoneConfigCache } = require('../services/assistant');
const { searchKnowledgeBase, formatRAGContext } = require('../services/rag');
const { resolveTemplateVariables } = require('../services/template');
const { formatMemoryForPrompt } = require('../services/memory');

// ============================================
// TWILIO PHONE NUMBER IMPORT
// ============================================

/**
 * Import a Twilio phone number directly (ElevenLabs-style)
 * Validates credentials and phone number, then configures webhook
 * POST /api/twilio/import-direct
 * Body: { accountSid, authToken, phoneNumber, label, userId, smsEnabled }
 */
router.post('/import-direct', async (req, res) => {
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

        // Encrypt the auth token before storing (SECURITY: Never store plain text secrets)
        const encryptedAuthToken = encrypt(authToken);

        // Save to our database
        const { data: phoneNumberData, error: dbError } = await supabase
            .from('phone_numbers')
            .insert({
                number: normalizedNumber,
                provider: 'Twilio',
                label: label || twilioNumber.friendly_name || 'Twilio Number',
                twilio_phone_number: normalizedNumber,
                twilio_account_sid: accountSid,
                twilio_auth_token: encryptedAuthToken,
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
router.post('/import-number', async (req, res) => {
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

        // Encrypt the auth token before storing (SECURITY: Never store plain text secrets)
        const encryptedAuthToken = encrypt(authToken);

        // Save to our database
        const { data: phoneNumberData, error: dbError } = await supabase
            .from('phone_numbers')
            .insert({
                number: phoneNumber,
                provider: 'Twilio',
                label: label || 'Twilio Number',
                twilio_phone_number: phoneNumber,
                twilio_account_sid: accountSid,
                twilio_auth_token: encryptedAuthToken, // Encrypted - use decrypt() to retrieve
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
 * 
 * This webhook is called by Twilio when someone calls a number configured with our webhook URL.
 * It looks up the phone number configuration and assigned assistant, then responds with TwiML.
 */
router.post('/voice', async (req, res) => {
    try {
        const callData = req.body;
        console.log('📞 Twilio voice webhook received:', {
            callSid: callData.CallSid,
            from: callData.From,
            to: callData.To,
            status: callData.CallStatus
        });

        // Find the phone number configuration with joined assistant data
        const { data: phoneConfig, error: phoneError } = await supabase
            .from('phone_numbers')
            .select(`
                *,
                assistant:assistants(
                    id, 
                    name, 
                    system_prompt, 
                    first_message,
                    voice_id,
                    language,
                    language_settings,
                    style_settings
                )
            `)
            .eq('twilio_phone_number', callData.To)
            .single();

        if (phoneError || !phoneConfig) {
            console.log('⚠️ No configuration found for number:', callData.To);
            res.type('text/xml');
            return res.send(`
                <Response>
                    <Say voice="Polly.Joanna">Sorry, this number is not configured. Goodbye.</Say>
                    <Hangup/>
                </Response>
            `);
        }

        console.log('📱 Phone config found:', {
            phoneId: phoneConfig.id,
            label: phoneConfig.label,
            hasAssistant: !!phoneConfig.assistant_id
        });

        // If no assistant is assigned, provide a helpful message
        if (!phoneConfig.assistant_id || !phoneConfig.assistant) {
            console.log('⚠️ No assistant assigned to number:', phoneConfig.number);
            res.type('text/xml');
            return res.send(`
                <Response>
                    <Say voice="Polly.Joanna">Thank you for calling. This number is active but no AI assistant has been configured yet. Please contact the administrator to assign an assistant. Goodbye.</Say>
                    <Hangup/>
                </Response>
            `);
        }

        const assistant = phoneConfig.assistant;
        console.log('🤖 Assistant found:', {
            id: assistant.id,
            name: assistant.name
        });

        // Get the first message or use a default greeting
        const firstMessage = assistant.first_message || 
            `Hello! Thank you for calling. I'm ${assistant.name || 'your AI assistant'}. How can I help you today?`;

        // Log the incoming call to the database
        const { data: callLog, error: logError } = await supabase
            .from('call_logs')
            .insert({
                call_sid: callData.CallSid,
                phone_number_id: phoneConfig.id,
                assistant_id: assistant.id,
                user_id: phoneConfig.user_id,
                from_number: callData.From,
                to_number: callData.To,
                direction: 'inbound',
                status: 'ringing',
                started_at: new Date().toISOString()
            })
            .select()
            .single();

        if (logError) {
            console.warn('⚠️ Failed to log call:', logError.message);
        } else {
            console.log('📝 Call logged:', callLog?.id);
        }

        // TODO: In production, integrate with real-time voice AI service
        // For now, return TwiML with the assistant's first message
        // This could be extended to:
        // 1. Connect to a WebSocket for real-time AI conversation
        // 2. Use Twilio <Stream> to stream audio to an AI service
        // 3. Use <Gather> to collect speech input and process with AI
        
        res.type('text/xml');
        res.send(`
            <Response>
                <Say voice="Polly.Joanna">${escapeXml(firstMessage)}</Say>
                <Gather input="speech" timeout="5" speechTimeout="auto" action="/api/webhooks/twilio/voice/gather" method="POST">
                    <Say voice="Polly.Joanna">I'm listening...</Say>
                </Gather>
                <Say voice="Polly.Joanna">I didn't hear anything. Goodbye!</Say>
                <Hangup/>
            </Response>
        `);

    } catch (error) {
        console.error('❌ Twilio voice webhook error:', error);
        res.type('text/xml');
        res.send(`
            <Response>
                <Say voice="Polly.Joanna">We are experiencing technical difficulties. Please try again later.</Say>
                <Hangup/>
            </Response>
        `);
    }
});

/**
 * Twilio Voice Gather Callback - Handles speech input
 * POST /api/webhooks/twilio/voice/gather
 */
router.post('/voice/gather', async (req, res) => {
    try {
        const { SpeechResult, CallSid, From, To } = req.body;
        
        console.log('🎤 Speech gathered:', {
            callSid: CallSid,
            speechResult: SpeechResult
        });

        if (!SpeechResult) {
            res.type('text/xml');
            return res.send(`
                <Response>
                    <Say voice="Polly.Joanna">I didn't catch that. Could you please repeat?</Say>
                    <Gather input="speech" timeout="5" speechTimeout="auto" action="/api/webhooks/twilio/voice/gather" method="POST">
                        <Say voice="Polly.Joanna">I'm listening...</Say>
                    </Gather>
                    <Say voice="Polly.Joanna">Goodbye!</Say>
                    <Hangup/>
                </Response>
            `);
        }

        // Get phone config to find the assistant
        const { data: phoneConfig } = await supabase
            .from('phone_numbers')
            .select(`
                *,
                assistant:assistants(*)
            `)
            .eq('twilio_phone_number', To)
            .single();

        if (!phoneConfig?.assistant) {
            res.type('text/xml');
            return res.send(`
                <Response>
                    <Say voice="Polly.Joanna">Sorry, no assistant is available. Goodbye.</Say>
                    <Hangup/>
                </Response>
            `);
        }

        // TODO: In production, use OpenAI/Claude to generate a response
        // For now, acknowledge the input
        const acknowledgment = `I heard you say: ${SpeechResult}. Thank you for calling. We will process your request. Goodbye!`;

        res.type('text/xml');
        res.send(`
            <Response>
                <Say voice="Polly.Joanna">${escapeXml(acknowledgment)}</Say>
                <Hangup/>
            </Response>
        `);

    } catch (error) {
        console.error('❌ Twilio gather webhook error:', error);
        res.type('text/xml');
        res.send(`
            <Response>
                <Say voice="Polly.Joanna">We encountered an error processing your request. Goodbye.</Say>
                <Hangup/>
            </Response>
        `);
    }
});

/**
 * Helper function to escape XML special characters
 */
function escapeXml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Twilio Status Callback - Handles call status updates
 * POST /api/webhooks/twilio/status
 */
router.post('/status', async (req, res) => {
    try {
        const statusData = req.body;
        console.log('📊 Twilio status callback:', {
            callSid: statusData.CallSid,
            status: statusData.CallStatus,
            duration: statusData.CallDuration
        });

        // Map Twilio status to our status
        const statusMap = {
            'queued': 'queued',
            'ringing': 'ringing',
            'in-progress': 'in_progress',
            'completed': 'completed',
            'busy': 'failed',
            'failed': 'failed',
            'no-answer': 'failed',
            'canceled': 'failed'
        };

        const mappedStatus = statusMap[statusData.CallStatus] || statusData.CallStatus;

        // Update call log in database
        const updateData = {
            status: mappedStatus,
            updated_at: new Date().toISOString()
        };

        // Add duration and end time for completed calls
        if (statusData.CallStatus === 'completed') {
            updateData.ended_at = new Date().toISOString();
            updateData.duration_seconds = parseInt(statusData.CallDuration) || 0;
        }

        const { error } = await supabase
            .from('call_logs')
            .update(updateData)
            .eq('call_sid', statusData.CallSid);

        if (error) {
            console.warn('⚠️ Failed to update call status:', error.message);
        } else {
            console.log('✅ Call status updated:', statusData.CallSid, '->', mappedStatus);
        }

        res.sendStatus(200);

    } catch (error) {
        console.error('❌ Twilio status callback error:', error);
        res.sendStatus(500);
    }
});


module.exports = router;

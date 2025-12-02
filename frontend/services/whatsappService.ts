/**
 * WhatsApp Business Cloud API Service
 * 
 * This service handles all interactions with the WhatsApp Business Cloud API
 * including messaging, calling, and configuration management.
 * 
 * Reference: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

import {
    WhatsAppConfig,
    WhatsAppMessage,
    WhatsAppCall,
    WhatsAppContact,
    WhatsAppTemplate,
    WhatsAppCallSettings,
    SendWhatsAppMessageInput,
    InitiateWhatsAppCallInput,
    WhatsAppMessageContent
} from '../types';

import { supabase } from './supabase';

// WhatsApp Cloud API Base URL
const WHATSAPP_API_BASE = 'https://graph.facebook.com/v21.0';

// ============================================
// CONFIGURATION MANAGEMENT
// ============================================

/**
 * Get all WhatsApp configurations for the current user
 */
export const getWhatsAppConfigs = async (): Promise<WhatsAppConfig[]> => {
    try {
        const { data, error } = await supabase
            .from('whatsapp_configs')
            .select('*, assistants(id, name)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return mapWhatsAppConfigs(data || []);
    } catch (error) {
        console.error('Error fetching WhatsApp configs:', error);
        return [];
    }
};

/**
 * Get a single WhatsApp configuration by ID
 */
export const getWhatsAppConfig = async (id: string): Promise<WhatsAppConfig | null> => {
    try {
        const { data, error } = await supabase
            .from('whatsapp_configs')
            .select('*, assistants(id, name)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return mapWhatsAppConfig(data);
    } catch (error) {
        console.error('Error fetching WhatsApp config:', error);
        return null;
    }
};

/**
 * Create a new WhatsApp configuration
 */
export const createWhatsAppConfig = async (config: {
    wabaId: string;
    phoneNumberId: string;
    displayPhoneNumber: string;
    displayName: string;
    accessToken: string;
    appId?: string;
    webhookVerifyToken?: string;
}): Promise<WhatsAppConfig | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const webhookVerifyToken = config.webhookVerifyToken || generateVerifyToken();

        const { data, error } = await (supabase
            .from('whatsapp_configs') as any)
            .insert({
                user_id: user.id,
                waba_id: config.wabaId,
                phone_number_id: config.phoneNumberId,
                display_phone_number: config.displayPhoneNumber,
                display_name: config.displayName,
                access_token: config.accessToken,
                app_id: config.appId,
                webhook_verify_token: webhookVerifyToken,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw error;
        return mapWhatsAppConfig(data);
    } catch (error) {
        console.error('Error creating WhatsApp config:', error);
        return null;
    }
};

/**
 * Update WhatsApp configuration
 */
export const updateWhatsAppConfig = async (
    id: string,
    updates: Partial<{
        displayName: string;
        accessToken: string;
        callingEnabled: boolean;
        chatbotEnabled: boolean;
        callSettings: WhatsAppCallSettings;
        assistantId: string | null;
        status: WhatsAppConfig['status'];
    }>
): Promise<WhatsAppConfig | null> => {
    try {
        const updateData: any = {};
        
        if (updates.displayName !== undefined) updateData.display_name = updates.displayName;
        if (updates.accessToken !== undefined) updateData.access_token = updates.accessToken;
        if (updates.callingEnabled !== undefined) updateData.calling_enabled = updates.callingEnabled;
        if (updates.chatbotEnabled !== undefined) updateData.chatbot_enabled = updates.chatbotEnabled;
        if (updates.callSettings !== undefined) updateData.call_settings = updates.callSettings;
        if (updates.assistantId !== undefined) updateData.assistant_id = updates.assistantId;
        if (updates.status !== undefined) updateData.status = updates.status;

        const { data, error } = await (supabase
            .from('whatsapp_configs') as any)
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return mapWhatsAppConfig(data);
    } catch (error) {
        console.error('Error updating WhatsApp config:', error);
        return null;
    }
};

/**
 * Delete WhatsApp configuration
 */
export const deleteWhatsAppConfig = async (id: string): Promise<boolean> => {
    try {
        const { error } = await (supabase
            .from('whatsapp_configs') as any)
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting WhatsApp config:', error);
        return false;
    }
};

/**
 * Verify WhatsApp Business Account connection
 */
export const verifyWhatsAppConnection = async (configId: string): Promise<{
    success: boolean;
    qualityRating?: string;
    messagingLimit?: number;
    error?: string;
}> => {
    try {
        const config = await getWhatsAppConfig(configId);
        if (!config) throw new Error('Config not found');

        // Call WhatsApp API to verify connection
        const response = await fetch(
            `${WHATSAPP_API_BASE}/${config.phoneNumberId}?fields=status,quality_rating,messaging_limit`,
            {
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`
                }
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to verify connection');
        }

        const data = await response.json();

        // Update config with latest status
        await updateWhatsAppConfig(configId, {
            status: data.status === 'CONNECTED' ? 'connected' : 'error'
        });

        // Also update quality rating and messaging limit in DB
        await (supabase
            .from('whatsapp_configs') as any)
            .update({
                quality_rating: data.quality_rating,
                messaging_limit: parseInt(data.messaging_limit) || null,
                last_synced_at: new Date().toISOString()
            })
            .eq('id', configId);

        return {
            success: true,
            qualityRating: data.quality_rating,
            messagingLimit: parseInt(data.messaging_limit)
        };
    } catch (error: any) {
        console.error('Error verifying WhatsApp connection:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// ============================================
// MESSAGING
// ============================================

/**
 * Send a WhatsApp message
 */
export const sendWhatsAppMessage = async (input: SendWhatsAppMessageInput): Promise<WhatsAppMessage | null> => {
    try {
        const config = await getWhatsAppConfig(input.configId);
        if (!config) throw new Error('Config not found');

        // Build message payload based on type
        const payload = buildMessagePayload(input);

        // Send via WhatsApp API
        const response = await fetch(
            `${WHATSAPP_API_BASE}/${config.phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to send message');
        }

        const data = await response.json();

        // Store message in database
        const { data: message, error } = await (supabase
            .from('whatsapp_messages') as any)
            .insert({
                wa_message_id: data.messages[0].id,
                config_id: input.configId,
                from_number: config.displayPhoneNumber,
                to_number: input.to,
                direction: 'outbound',
                message_type: input.type,
                content: input.content,
                status: 'sent',
                context_message_id: input.contextMessageId,
                is_from_bot: false,
                message_timestamp: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return mapWhatsAppMessage(message);
    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        return null;
    }
};

/**
 * Get messages for a conversation
 */
export const getWhatsAppMessages = async (
    configId: string,
    contactNumber: string,
    limit = 50
): Promise<WhatsAppMessage[]> => {
    try {
        const { data, error } = await supabase
            .from('whatsapp_messages')
            .select('*')
            .eq('config_id', configId)
            .or(`from_number.eq.${contactNumber},to_number.eq.${contactNumber}`)
            .order('message_timestamp', { ascending: true })
            .limit(limit);

        if (error) throw error;
        return (data || []).map(mapWhatsAppMessage);
    } catch (error) {
        console.error('Error fetching WhatsApp messages:', error);
        return [];
    }
};

/**
 * Mark message as read
 */
export const markMessageAsRead = async (configId: string, waMessageId: string): Promise<boolean> => {
    try {
        const config = await getWhatsAppConfig(configId);
        if (!config) throw new Error('Config not found');

        // Send read receipt via WhatsApp API
        await fetch(
            `${WHATSAPP_API_BASE}/${config.phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    status: 'read',
                    message_id: waMessageId
                })
            }
        );

        return true;
    } catch (error) {
        console.error('Error marking message as read:', error);
        return false;
    }
};

// ============================================
// CALLING
// ============================================

/**
 * Enable/disable calling features on a phone number
 */
export const updateCallingSettings = async (
    configId: string,
    settings: WhatsAppCallSettings
): Promise<boolean> => {
    try {
        const config = await getWhatsAppConfig(configId);
        if (!config) throw new Error('Config not found');

        // Update settings via WhatsApp API
        const response = await fetch(
            `${WHATSAPP_API_BASE}/${config.phoneNumberId}/settings`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    calling: {
                        enabled: settings.inboundCallsEnabled || settings.outboundCallsEnabled,
                        business_hours: settings.businessHours ? formatBusinessHours(settings.businessHours) : undefined,
                        callback_requests: settings.callbackRequestEnabled
                    }
                })
            }
        );

        if (!response.ok) {
            const error = await response.json();
            console.error('WhatsApp API error:', error);
            // Continue anyway to save locally
        }

        // Update in database
        await updateWhatsAppConfig(configId, {
            callingEnabled: settings.inboundCallsEnabled || settings.outboundCallsEnabled,
            callSettings: settings
        });

        return true;
    } catch (error) {
        console.error('Error updating calling settings:', error);
        return false;
    }
};

/**
 * Request permission to call a user
 */
export const requestCallPermission = async (
    configId: string,
    toNumber: string,
    templateName?: string
): Promise<boolean> => {
    try {
        const config = await getWhatsAppConfig(configId);
        if (!config) throw new Error('Config not found');

        // Send call permission request template
        const response = await fetch(
            `${WHATSAPP_API_BASE}/${config.phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: toNumber,
                    type: 'template',
                    template: {
                        name: templateName || 'call_permission_request',
                        language: { code: 'en' }
                    }
                })
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to send call permission request');
        }

        // Update contact's permission request timestamp
        await (supabase
            .from('whatsapp_contacts') as any)
            .update({
                calling_permission_requested_at: new Date().toISOString()
            })
            .eq('config_id', configId)
            .eq('phone_number', toNumber);

        return true;
    } catch (error) {
        console.error('Error requesting call permission:', error);
        return false;
    }
};

/**
 * Initiate a WhatsApp call (business-initiated)
 */
export const initiateWhatsAppCall = async (input: InitiateWhatsAppCallInput): Promise<WhatsAppCall | null> => {
    try {
        const config = await getWhatsAppConfig(input.configId);
        if (!config) throw new Error('Config not found');

        if (!config.callingEnabled) {
            throw new Error('Calling is not enabled for this number');
        }

        // Initiate call via WhatsApp API
        const response = await fetch(
            `${WHATSAPP_API_BASE}/${config.phoneNumberId}/calls`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: input.to,
                    type: 'voice'
                })
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to initiate call');
        }

        const data = await response.json();

        // Store call in database
        const { data: call, error } = await (supabase
            .from('whatsapp_calls') as any)
            .insert({
                wa_call_id: data.calls[0].id,
                config_id: input.configId,
                from_number: config.displayPhoneNumber,
                to_number: input.to,
                direction: 'outbound',
                status: 'ringing',
                started_at: new Date().toISOString(),
                handled_by_bot: !!input.assistantId,
                assistant_id: input.assistantId
            })
            .select()
            .single();

        if (error) throw error;
        return mapWhatsAppCall(call);
    } catch (error) {
        console.error('Error initiating WhatsApp call:', error);
        return null;
    }
};

/**
 * Get call history
 */
export const getWhatsAppCalls = async (configId: string, limit = 50): Promise<WhatsAppCall[]> => {
    try {
        const { data, error } = await supabase
            .from('whatsapp_calls')
            .select('*, assistants(id, name)')
            .eq('config_id', configId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return (data || []).map(mapWhatsAppCall);
    } catch (error) {
        console.error('Error fetching WhatsApp calls:', error);
        return [];
    }
};

// ============================================
// CONTACTS
// ============================================

/**
 * Get all contacts for a WhatsApp config
 */
export const getWhatsAppContacts = async (configId: string): Promise<WhatsAppContact[]> => {
    try {
        const { data, error } = await supabase
            .from('whatsapp_contacts')
            .select('*, customers(id, name, email)')
            .eq('config_id', configId)
            .order('last_message_at', { ascending: false, nullsFirst: false });

        if (error) throw error;
        return (data || []).map(mapWhatsAppContact);
    } catch (error) {
        console.error('Error fetching WhatsApp contacts:', error);
        return [];
    }
};

/**
 * Create or update a WhatsApp contact
 */
export const upsertWhatsAppContact = async (
    configId: string,
    waId: string,
    profileName?: string,
    customerId?: string
): Promise<WhatsAppContact | null> => {
    try {
        const phoneNumber = '+' + waId;

        const { data, error } = await (supabase
            .from('whatsapp_contacts') as any)
            .upsert({
                config_id: configId,
                wa_id: waId,
                phone_number: phoneNumber,
                profile_name: profileName,
                customer_id: customerId
            }, {
                onConflict: 'config_id,wa_id'
            })
            .select()
            .single();

        if (error) throw error;
        return mapWhatsAppContact(data);
    } catch (error) {
        console.error('Error upserting WhatsApp contact:', error);
        return null;
    }
};

// ============================================
// TEMPLATES
// ============================================

/**
 * Sync templates from WhatsApp Business Account
 */
export const syncWhatsAppTemplates = async (configId: string): Promise<WhatsAppTemplate[]> => {
    try {
        const config = await getWhatsAppConfig(configId);
        if (!config) throw new Error('Config not found');

        // Fetch templates from WhatsApp API
        const response = await fetch(
            `${WHATSAPP_API_BASE}/${config.wabaId}/message_templates`,
            {
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`
                }
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to fetch templates');
        }

        const data = await response.json();
        const templates: WhatsAppTemplate[] = [];

        // Upsert each template
        for (const template of data.data || []) {
            const { data: upserted, error } = await (supabase
                .from('whatsapp_templates') as any)
                .upsert({
                    config_id: configId,
                    template_name: template.name,
                    language: template.language,
                    category: template.category,
                    status: template.status,
                    components: template.components,
                    quality_score: template.quality_score?.score
                }, {
                    onConflict: 'config_id,template_name,language'
                })
                .select()
                .single();

            if (!error && upserted) {
                templates.push(mapWhatsAppTemplate(upserted));
            }
        }

        return templates;
    } catch (error) {
        console.error('Error syncing WhatsApp templates:', error);
        return [];
    }
};

/**
 * Get templates for a config
 */
export const getWhatsAppTemplates = async (configId: string): Promise<WhatsAppTemplate[]> => {
    try {
        const { data, error } = await supabase
            .from('whatsapp_templates')
            .select('*')
            .eq('config_id', configId)
            .eq('status', 'APPROVED')
            .order('template_name');

        if (error) throw error;
        return (data || []).map(mapWhatsAppTemplate);
    } catch (error) {
        console.error('Error fetching WhatsApp templates:', error);
        return [];
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateVerifyToken(): string {
    return 'verify_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function buildMessagePayload(input: SendWhatsAppMessageInput): any {
    const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: input.to,
        type: input.type
    };

    if (input.contextMessageId) {
        payload.context = { message_id: input.contextMessageId };
    }

    switch (input.type) {
        case 'text':
            payload.text = {
                body: input.content.body,
                preview_url: input.content.previewUrl ?? true
            };
            break;

        case 'image':
        case 'video':
        case 'audio':
        case 'document':
            payload[input.type] = {
                id: input.content.mediaId,
                link: input.content.mediaUrl,
                caption: input.content.caption,
                filename: input.content.filename
            };
            break;

        case 'location':
            payload.location = {
                latitude: input.content.latitude,
                longitude: input.content.longitude,
                name: input.content.name,
                address: input.content.address
            };
            break;

        case 'interactive':
            payload.interactive = input.content.interactive;
            break;

        case 'template':
            payload.template = input.content.template;
            break;

        case 'reaction':
            payload.reaction = {
                message_id: input.content.reactToMessageId,
                emoji: input.content.emoji
            };
            break;
    }

    return payload;
}

function formatBusinessHours(hours: any): any {
    // Format business hours for WhatsApp API
    return {
        timezone: hours.timezone,
        hours: hours.schedule?.map((s: any) => ({
            day: s.day.toUpperCase(),
            start_time: s.startTime,
            end_time: s.endTime,
            is_enabled: s.enabled
        }))
    };
}

// ============================================
// DATA MAPPERS
// ============================================

function mapWhatsAppConfig(data: any): WhatsAppConfig {
    return {
        id: data.id,
        userId: data.user_id,
        wabaId: data.waba_id,
        phoneNumberId: data.phone_number_id,
        displayPhoneNumber: data.display_phone_number,
        displayName: data.display_name,
        accessToken: data.access_token,
        appId: data.app_id,
        webhookVerifyToken: data.webhook_verify_token,
        webhookUrl: data.webhook_url,
        status: data.status,
        qualityRating: data.quality_rating,
        messagingLimit: data.messaging_limit,
        callingEnabled: data.calling_enabled,
        chatbotEnabled: data.chatbot_enabled,
        callSettings: data.call_settings,
        assistantId: data.assistant_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        lastSyncedAt: data.last_synced_at
    };
}

function mapWhatsAppConfigs(data: any[]): WhatsAppConfig[] {
    return data.map(mapWhatsAppConfig);
}

function mapWhatsAppMessage(data: any): WhatsAppMessage {
    return {
        id: data.id,
        waMessageId: data.wa_message_id,
        configId: data.config_id,
        fromNumber: data.from_number,
        toNumber: data.to_number,
        direction: data.direction,
        type: data.message_type,
        content: data.content,
        status: data.status,
        errorCode: data.error_code,
        errorMessage: data.error_message,
        contextMessageId: data.context_message_id,
        isFromBot: data.is_from_bot,
        assistantId: data.assistant_id,
        timestamp: data.message_timestamp,
        deliveredAt: data.delivered_at,
        readAt: data.read_at,
        createdAt: data.created_at
    };
}

function mapWhatsAppCall(data: any): WhatsAppCall {
    return {
        id: data.id,
        waCallId: data.wa_call_id,
        configId: data.config_id,
        fromNumber: data.from_number,
        toNumber: data.to_number,
        direction: data.direction,
        status: data.status,
        startedAt: data.started_at,
        connectedAt: data.connected_at,
        endedAt: data.ended_at,
        durationSeconds: data.duration_seconds,
        handledByBot: data.handled_by_bot,
        assistantId: data.assistant_id,
        transcript: data.transcript,
        callbackRequested: data.callback_requested,
        callbackScheduledAt: data.callback_scheduled_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}

function mapWhatsAppContact(data: any): WhatsAppContact {
    return {
        id: data.id,
        configId: data.config_id,
        waId: data.wa_id,
        profileName: data.profile_name,
        phoneNumber: data.phone_number,
        customerId: data.customer_id,
        isOptedIn: data.is_opted_in,
        lastMessageAt: data.last_message_at,
        conversationWindowOpen: data.conversation_window_open,
        windowExpiresAt: data.window_expires_at,
        callingPermissionGranted: data.calling_permission_granted,
        callingPermissionRequestedAt: data.calling_permission_requested_at,
        totalMessages: data.total_messages,
        totalCalls: data.total_calls,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}

function mapWhatsAppTemplate(data: any): WhatsAppTemplate {
    return {
        id: data.id,
        configId: data.config_id,
        name: data.template_name,
        language: data.language,
        category: data.category,
        status: data.status,
        components: data.components,
        qualityScore: data.quality_score,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

/**
 * Subscribe to new messages for a config
 */
export const subscribeToMessages = (
    configId: string,
    onMessage: (message: WhatsAppMessage) => void
) => {
    return supabase
        .channel(`whatsapp_messages:${configId}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'whatsapp_messages',
                filter: `config_id=eq.${configId}`
            },
            (payload) => {
                onMessage(mapWhatsAppMessage(payload.new));
            }
        )
        .subscribe();
};

/**
 * Subscribe to call updates for a config
 */
export const subscribeToCalls = (
    configId: string,
    onCall: (call: WhatsAppCall) => void
) => {
    return supabase
        .channel(`whatsapp_calls:${configId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'whatsapp_calls',
                filter: `config_id=eq.${configId}`
            },
            (payload) => {
                onCall(mapWhatsAppCall(payload.new));
            }
        )
        .subscribe();
};

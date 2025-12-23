/**
 * LiveKit Routes
 * ==============
 * Handles LiveKit token generation and webhook processing for voice agents.
 * 
 * Endpoints:
 * - POST /api/livekit/token - Generate room access token
 * - POST /api/livekit/webhook - Process LiveKit webhooks
 * - GET /api/livekit/rooms - List active rooms (admin)
 */

const express = require('express');
const router = express.Router();
const { AccessToken } = require('livekit-server-sdk');
const { supabase } = require('../config');
const { v4: uuidv4 } = require('uuid');

// LiveKit configuration
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'APIVoicoryDev';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'VoicoryDevSecretKey12345678901234567890';
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'wss://livekit.voicory.com';

/**
 * POST /api/livekit/token
 * Generate a LiveKit access token for a voice session
 * 
 * Body:
 * - assistantId: UUID of the assistant
 * - customerId: Optional customer UUID for context
 * - sessionType: 'widget' | 'phone' | 'test'
 * 
 * Headers:
 * - Authorization: Bearer <supabase_token>
 */
router.post('/token', async (req, res) => {
    try {
        // Get user from auth header
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing authorization header' });
        }
        
        const token = authHeader.substring(7);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        
        const { assistantId, customerId, sessionType = 'widget' } = req.body;
        
        if (!assistantId) {
            return res.status(400).json({ error: 'assistantId is required' });
        }
        
        // Verify user owns the assistant
        const { data: assistant, error: assistantError } = await supabase
            .from('assistants')
            .select('id, name, user_id')
            .eq('id', assistantId)
            .eq('user_id', user.id)
            .single();
        
        if (assistantError || !assistant) {
            return res.status(404).json({ error: 'Assistant not found' });
        }
        
        // Generate unique room name
        // Format: voice_{assistantId}_{userId}_{customerId}_{timestamp}
        const roomName = `voice_${assistantId}_${user.id}_${customerId || 'anon'}_${Date.now()}`;
        
        // Generate participant identity
        const participantIdentity = `user_${user.id}`;
        
        // Create access token
        const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
            identity: participantIdentity,
            name: user.email || 'User',
            // Token expires in 1 hour
            ttl: '1h',
            // Metadata accessible in agent
            metadata: JSON.stringify({
                assistantId,
                userId: user.id,
                customerId,
                sessionType,
            }),
        });
        
        // Grant room permissions
        at.addGrant({
            room: roomName,
            roomJoin: true,
            canPublish: true,
            canPublishData: true,
            canSubscribe: true,
            // Allow agent to see this participant
            hidden: false,
        });
        
        const accessToken = await at.toJwt();
        
        // Create session record in database
        const { data: session, error: sessionError } = await supabase
            .from('voice_sessions')
            .insert({
                user_id: user.id,
                assistant_id: assistantId,
                customer_id: customerId,
                session_type: sessionType,
                transport: 'livekit',
                status: 'created',
                room_name: roomName,
                participant_identity: participantIdentity,
            })
            .select()
            .single();
        
        if (sessionError) {
            console.error('Failed to create session record:', sessionError);
            // Continue anyway - token is valid
        }
        
        console.log(`[LiveKit] Token generated for room: ${roomName}`);
        
        return res.json({
            token: accessToken,
            roomName,
            livekitUrl: LIVEKIT_URL,
            sessionId: session?.id,
        });
        
    } catch (error) {
        console.error('[LiveKit] Token generation error:', error);
        return res.status(500).json({ error: 'Failed to generate token' });
    }
});

/**
 * POST /api/livekit/webhook
 * Process LiveKit server webhooks
 * 
 * Events:
 * - room_started: Room created
 * - room_finished: Room ended
 * - participant_joined: User joined
 * - participant_left: User left
 * - track_published: Audio/video track published
 */
router.post('/webhook', async (req, res) => {
    try {
        // TODO: Verify webhook signature with LIVEKIT_API_SECRET
        // const signature = req.headers['authorization'];
        
        const event = req.body;
        const eventType = event.event;
        
        console.log(`[LiveKit Webhook] ${eventType}:`, JSON.stringify(event).slice(0, 200));
        
        switch (eventType) {
            case 'room_started': {
                const roomName = event.room?.name;
                if (roomName) {
                    // Update session status
                    await supabase
                        .from('voice_sessions')
                        .update({ 
                            status: 'active',
                            connected_at: new Date().toISOString(),
                        })
                        .eq('room_name', roomName);
                }
                break;
            }
            
            case 'room_finished': {
                const roomName = event.room?.name;
                if (roomName) {
                    // Calculate duration and update session
                    const { data: session } = await supabase
                        .from('voice_sessions')
                        .select('connected_at')
                        .eq('room_name', roomName)
                        .single();
                    
                    const duration = session?.connected_at
                        ? Math.floor((Date.now() - new Date(session.connected_at).getTime()) / 1000)
                        : 0;
                    
                    await supabase
                        .from('voice_sessions')
                        .update({
                            status: 'completed',
                            ended_at: new Date().toISOString(),
                            duration_seconds: duration,
                        })
                        .eq('room_name', roomName);
                }
                break;
            }
            
            case 'participant_joined': {
                const participant = event.participant;
                const roomName = event.room?.name;
                
                // Log participant join
                console.log(`[LiveKit] Participant joined: ${participant?.identity} in ${roomName}`);
                break;
            }
            
            case 'participant_left': {
                const participant = event.participant;
                const roomName = event.room?.name;
                
                // If user left, end the session
                if (participant?.identity?.startsWith('user_')) {
                    await supabase
                        .from('voice_sessions')
                        .update({ status: 'user_disconnected' })
                        .eq('room_name', roomName);
                }
                break;
            }
            
            default:
                // Log other events
                console.log(`[LiveKit Webhook] Unhandled event: ${eventType}`);
        }
        
        // Always respond 200 to acknowledge webhook
        return res.status(200).json({ received: true });
        
    } catch (error) {
        console.error('[LiveKit Webhook] Error:', error);
        // Still return 200 to prevent retries
        return res.status(200).json({ received: true, error: error.message });
    }
});

/**
 * GET /api/livekit/rooms
 * List active LiveKit rooms (admin/debug endpoint)
 */
router.get('/rooms', async (req, res) => {
    try {
        // This would require the LiveKit server SDK for room listing
        // For now, return active sessions from database
        const { data: sessions, error } = await supabase
            .from('voice_sessions')
            .select('*')
            .in('status', ['created', 'active', 'connecting'])
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) {
            throw error;
        }
        
        return res.json({
            rooms: sessions || [],
            count: sessions?.length || 0,
        });
        
    } catch (error) {
        console.error('[LiveKit] Failed to list rooms:', error);
        return res.status(500).json({ error: 'Failed to list rooms' });
    }
});

/**
 * DELETE /api/livekit/rooms/:roomName
 * Force end a room (admin endpoint)
 */
router.delete('/rooms/:roomName', async (req, res) => {
    try {
        const { roomName } = req.params;
        
        // Update session status
        await supabase
            .from('voice_sessions')
            .update({
                status: 'force_ended',
                ended_at: new Date().toISOString(),
            })
            .eq('room_name', roomName);
        
        // TODO: Use LiveKit SDK to actually close the room
        // const roomService = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
        // await roomService.deleteRoom(roomName);
        
        return res.json({ success: true, roomName });
        
    } catch (error) {
        console.error('[LiveKit] Failed to end room:', error);
        return res.status(500).json({ error: 'Failed to end room' });
    }
});

module.exports = router;

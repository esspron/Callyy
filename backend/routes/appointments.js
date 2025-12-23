/**
 * Appointment Booking Routes
 * 
 * API endpoints for appointment management:
 * 
 * Calendar Integrations:
 * - GET /api/appointments/integrations - List calendar integrations
 * - POST /api/appointments/integrations - Create integration
 * - GET /api/appointments/integrations/:id - Get integration
 * - PUT /api/appointments/integrations/:id - Update integration
 * - DELETE /api/appointments/integrations/:id - Delete integration
 * - POST /api/appointments/integrations/:id/test - Test connection
 * 
 * Appointment Types:
 * - GET /api/appointments/types - List appointment types
 * - POST /api/appointments/types - Create appointment type
 * - GET /api/appointments/types/:id - Get appointment type
 * - PUT /api/appointments/types/:id - Update appointment type
 * - DELETE /api/appointments/types/:id - Delete appointment type
 * 
 * Appointments:
 * - GET /api/appointments - List appointments
 * - POST /api/appointments - Create appointment
 * - GET /api/appointments/:id - Get appointment
 * - PUT /api/appointments/:id - Update appointment
 * - POST /api/appointments/:id/reschedule - Reschedule appointment
 * - POST /api/appointments/:id/cancel - Cancel appointment
 * - POST /api/appointments/:id/confirm - Confirm appointment
 * - POST /api/appointments/:id/complete - Mark as completed
 * - POST /api/appointments/:id/no-show - Mark as no-show
 * 
 * Availability:
 * - GET /api/appointments/availability - Get available slots
 * - GET /api/appointments/availability/slots - Get user's availability slots
 * - POST /api/appointments/availability/slots - Create availability slot
 * - PUT /api/appointments/availability/slots/:id - Update slot
 * - DELETE /api/appointments/availability/slots/:id - Delete slot
 * - POST /api/appointments/availability/overrides - Create override
 * - DELETE /api/appointments/availability/overrides/:id - Delete override
 * 
 * Voice Agent:
 * - POST /api/appointments/book-via-voice - Book appointment from voice agent
 * 
 * Webhooks:
 * - POST /api/appointments/webhooks/calcom - Cal.com webhook
 * - POST /api/appointments/webhooks/calendly - Calendly webhook
 * - POST /api/appointments/webhooks/google - Google Calendar webhook
 */

const express = require('express');
const router = express.Router();
const { supabase } = require('../config');
const appointmentService = require('../services/appointments');
const { verifySupabaseAuth } = require('../lib/auth');

// All routes require authentication (except webhooks)
router.use((req, res, next) => {
    if (req.path.startsWith('/webhooks/')) {
        return next();
    }
    return verifySupabaseAuth(req, res, next);
});

// ============================================
// CALENDAR INTEGRATION ROUTES
// ============================================

/**
 * GET /api/appointments/integrations
 * List all calendar integrations for user
 */
router.get('/integrations', async (req, res) => {
    try {
        const userId = req.user.id;
        
        const { data, error } = await supabase
            .from('calendar_integrations')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Mask sensitive data
        const sanitized = (data || []).map(int => ({
            ...int,
            api_key: int.api_key ? '••••••••' : null,
            access_token: int.access_token ? '••••••••' : null,
            refresh_token: int.refresh_token ? '••••••••' : null,
            webhook_secret: int.webhook_secret ? '••••••••' : null,
        }));
        
        res.json({ integrations: sanitized });
    } catch (error) {
        console.error('Error fetching calendar integrations:', error);
        res.status(500).json({ error: 'Failed to fetch integrations' });
    }
});

/**
 * POST /api/appointments/integrations
 * Create a new calendar integration
 */
router.post('/integrations', async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            provider,
            api_key,
            access_token,
            refresh_token,
            token_expires_at,
            external_calendar_id,
            default_meeting_duration = 30,
            buffer_before_minutes = 0,
            buffer_after_minutes = 15,
            timezone = 'America/New_York',
            settings = {},
        } = req.body;
        
        // Validate provider
        const validProviders = ['cal_com', 'calendly', 'google_calendar', 'follow_up_boss'];
        if (!validProviders.includes(provider)) {
            return res.status(400).json({ error: 'Invalid calendar provider' });
        }
        
        const providerNames = {
            cal_com: 'Cal.com',
            calendly: 'Calendly',
            google_calendar: 'Google Calendar',
            follow_up_boss: 'Follow Up Boss',
        };
        
        // Check if integration already exists
        const { data: existing } = await supabase
            .from('calendar_integrations')
            .select('id')
            .eq('user_id', userId)
            .eq('provider', provider)
            .single();
        
        if (existing) {
            return res.status(400).json({ error: 'Integration for this provider already exists' });
        }
        
        // Test connection
        const credentials = { apiKey: api_key, accessToken: access_token };
        const testResult = await appointmentService.testConnection(provider, credentials);
        
        if (!testResult.success) {
            return res.status(400).json({
                error: 'Failed to connect to calendar provider',
                details: testResult.message,
            });
        }
        
        // Create integration
        const { data, error } = await supabase
            .from('calendar_integrations')
            .insert({
                user_id: userId,
                provider,
                provider_name: providerNames[provider],
                api_key,
                access_token,
                refresh_token,
                token_expires_at,
                external_user_id: testResult.data?.uri || testResult.data?.email,
                external_calendar_id,
                is_enabled: true,
                is_connected: true,
                default_meeting_duration,
                buffer_before_minutes,
                buffer_after_minutes,
                timezone,
                settings,
            })
            .select()
            .single();
        
        if (error) throw error;
        
        // Create default appointment types for user if they don't have any
        await supabase.rpc('create_default_appointment_types', { p_user_id: userId });
        
        res.status(201).json({
            success: true,
            message: `Successfully connected to ${providerNames[provider]}`,
            integration: {
                ...data,
                api_key: data.api_key ? '••••••••' : null,
                access_token: data.access_token ? '••••••••' : null,
            },
        });
    } catch (error) {
        console.error('Error creating calendar integration:', error);
        res.status(500).json({ error: 'Failed to create integration' });
    }
});

/**
 * GET /api/appointments/integrations/:id
 */
router.get('/integrations/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        const { data, error } = await supabase
            .from('calendar_integrations')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();
        
        if (error || !data) {
            return res.status(404).json({ error: 'Integration not found' });
        }
        
        res.json({
            integration: {
                ...data,
                api_key: data.api_key ? '••••••••' : null,
                access_token: data.access_token ? '••••••••' : null,
            },
        });
    } catch (error) {
        console.error('Error fetching calendar integration:', error);
        res.status(500).json({ error: 'Failed to fetch integration' });
    }
});

/**
 * PUT /api/appointments/integrations/:id
 */
router.put('/integrations/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const updates = req.body;
        
        // Don't allow changing provider
        delete updates.provider;
        delete updates.user_id;
        
        const { data, error } = await supabase
            .from('calendar_integrations')
            .update(updates)
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({
            success: true,
            integration: {
                ...data,
                api_key: data.api_key ? '••••••••' : null,
                access_token: data.access_token ? '••••••••' : null,
            },
        });
    } catch (error) {
        console.error('Error updating calendar integration:', error);
        res.status(500).json({ error: 'Failed to update integration' });
    }
});

/**
 * DELETE /api/appointments/integrations/:id
 */
router.delete('/integrations/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        const { error } = await supabase
            .from('calendar_integrations')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);
        
        if (error) throw error;
        
        res.json({ success: true, message: 'Integration deleted' });
    } catch (error) {
        console.error('Error deleting calendar integration:', error);
        res.status(500).json({ error: 'Failed to delete integration' });
    }
});

/**
 * POST /api/appointments/integrations/:id/test
 */
router.post('/integrations/:id/test', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        const { data: integration, error } = await supabase
            .from('calendar_integrations')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();
        
        if (error || !integration) {
            return res.status(404).json({ error: 'Integration not found' });
        }
        
        const credentials = {
            apiKey: integration.api_key,
            accessToken: integration.access_token,
        };
        
        const result = await appointmentService.testConnection(integration.provider, credentials);
        
        // Update connection status
        await supabase
            .from('calendar_integrations')
            .update({
                is_connected: result.success,
                last_sync_at: result.success ? new Date().toISOString() : undefined,
                last_error: result.success ? null : result.message,
            })
            .eq('id', id);
        
        res.json(result);
    } catch (error) {
        console.error('Error testing calendar integration:', error);
        res.status(500).json({ error: 'Failed to test integration' });
    }
});

// ============================================
// APPOINTMENT TYPE ROUTES
// ============================================

/**
 * GET /api/appointments/types
 */
router.get('/types', async (req, res) => {
    try {
        const userId = req.user.id;
        const { active } = req.query;
        
        let query = supabase
            .from('appointment_types')
            .select('*')
            .eq('user_id', userId)
            .order('name');
        
        if (active === 'true') {
            query = query.eq('is_active', true);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        // Create default types if none exist
        if (!data || data.length === 0) {
            await supabase.rpc('create_default_appointment_types', { p_user_id: userId });
            
            const { data: newData } = await supabase
                .from('appointment_types')
                .select('*')
                .eq('user_id', userId)
                .order('name');
            
            return res.json({ appointmentTypes: newData || [] });
        }
        
        res.json({ appointmentTypes: data });
    } catch (error) {
        console.error('Error fetching appointment types:', error);
        res.status(500).json({ error: 'Failed to fetch appointment types' });
    }
});

/**
 * POST /api/appointments/types
 */
router.post('/types', async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            name,
            slug,
            description,
            category = 'general',
            duration_minutes = 30,
            buffer_before_minutes = 0,
            buffer_after_minutes = 15,
            is_active = true,
            requires_confirmation = false,
            max_advance_days = 60,
            min_notice_hours = 2,
            default_location,
            location_address,
            video_link,
            send_confirmation = true,
            send_reminder_24h = true,
            send_reminder_1h = true,
            color = '#10B981',
            calendar_integration_id,
            settings = {},
        } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        
        // Generate slug if not provided
        const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        const { data, error } = await supabase
            .from('appointment_types')
            .insert({
                user_id: userId,
                name,
                slug: finalSlug,
                description,
                category,
                duration_minutes,
                buffer_before_minutes,
                buffer_after_minutes,
                is_active,
                requires_confirmation,
                max_advance_days,
                min_notice_hours,
                default_location,
                location_address,
                video_link,
                send_confirmation,
                send_reminder_24h,
                send_reminder_1h,
                color,
                calendar_integration_id,
                settings,
            })
            .select()
            .single();
        
        if (error) {
            if (error.code === '23505') { // Unique violation
                return res.status(400).json({ error: 'An appointment type with this slug already exists' });
            }
            throw error;
        }
        
        res.status(201).json({ appointmentType: data });
    } catch (error) {
        console.error('Error creating appointment type:', error);
        res.status(500).json({ error: 'Failed to create appointment type' });
    }
});

/**
 * GET /api/appointments/types/:id
 */
router.get('/types/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        const { data, error } = await supabase
            .from('appointment_types')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();
        
        if (error || !data) {
            return res.status(404).json({ error: 'Appointment type not found' });
        }
        
        res.json({ appointmentType: data });
    } catch (error) {
        console.error('Error fetching appointment type:', error);
        res.status(500).json({ error: 'Failed to fetch appointment type' });
    }
});

/**
 * PUT /api/appointments/types/:id
 */
router.put('/types/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const updates = req.body;
        
        delete updates.user_id;
        
        const { data, error } = await supabase
            .from('appointment_types')
            .update(updates)
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({ appointmentType: data });
    } catch (error) {
        console.error('Error updating appointment type:', error);
        res.status(500).json({ error: 'Failed to update appointment type' });
    }
});

/**
 * DELETE /api/appointments/types/:id
 */
router.delete('/types/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        const { error } = await supabase
            .from('appointment_types')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);
        
        if (error) throw error;
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting appointment type:', error);
        res.status(500).json({ error: 'Failed to delete appointment type' });
    }
});

// ============================================
// APPOINTMENT ROUTES
// ============================================

/**
 * GET /api/appointments
 */
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            status,
            startDate,
            endDate,
            leadId,
            campaignId,
            page = 1,
            pageSize = 20,
        } = req.query;
        
        let query = supabase
            .from('appointments')
            .select('*, appointment_types(*)', { count: 'exact' })
            .eq('user_id', userId)
            .order('scheduled_at', { ascending: true });
        
        if (status) {
            query = query.eq('status', status);
        }
        if (startDate) {
            query = query.gte('scheduled_at', startDate);
        }
        if (endDate) {
            query = query.lte('scheduled_at', endDate);
        }
        if (leadId) {
            query = query.eq('lead_id', leadId);
        }
        if (campaignId) {
            query = query.eq('campaign_id', campaignId);
        }
        
        // Pagination
        const from = (parseInt(page) - 1) * parseInt(pageSize);
        const to = from + parseInt(pageSize) - 1;
        query = query.range(from, to);
        
        const { data, error, count } = await query;
        
        if (error) throw error;
        
        res.json({
            appointments: data || [],
            total: count || 0,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
        });
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ error: 'Failed to fetch appointments' });
    }
});

/**
 * POST /api/appointments
 */
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            appointment_type_id,
            appointment_type_name,
            scheduled_at,
            duration_minutes = 30,
            timezone = 'America/New_York',
            attendee_name,
            attendee_email,
            attendee_phone,
            attendee_notes,
            campaign_id,
            lead_id,
            call_id,
            assistant_id,
            location_type = 'in_person',
            location_address,
            location_notes,
            video_link,
            property_address,
            property_mls_id,
            property_price,
            internal_notes,
            booked_via = 'manual',
            booked_by_assistant_id,
            settings = {},
        } = req.body;
        
        if (!scheduled_at || !attendee_name) {
            return res.status(400).json({ error: 'scheduled_at and attendee_name are required' });
        }
        
        // Get appointment type name if ID provided
        let typeName = appointment_type_name;
        if (appointment_type_id && !typeName) {
            const { data: type } = await supabase
                .from('appointment_types')
                .select('name')
                .eq('id', appointment_type_id)
                .single();
            typeName = type?.name || 'Appointment';
        }
        
        // Check availability
        const isAvailable = await supabase.rpc('check_slot_availability', {
            p_user_id: userId,
            p_scheduled_at: scheduled_at,
            p_duration_minutes: duration_minutes,
        });
        
        if (!isAvailable.data) {
            return res.status(409).json({ error: 'Selected time slot is not available' });
        }
        
        // Create appointment
        const { data: appointment, error } = await supabase
            .from('appointments')
            .insert({
                user_id: userId,
                appointment_type_id,
                appointment_type_name: typeName || 'Appointment',
                status: 'scheduled',
                scheduled_at,
                duration_minutes,
                timezone,
                attendee_name,
                attendee_email,
                attendee_phone,
                attendee_notes,
                campaign_id,
                lead_id,
                call_id,
                assistant_id,
                location_type,
                location_address,
                location_notes,
                video_link,
                property_address,
                property_mls_id,
                property_price,
                internal_notes,
                booked_via,
                booked_by_assistant_id,
                settings,
            })
            .select('*, appointment_types(*)')
            .single();
        
        if (error) throw error;
        
        // Sync to external calendar if integration exists
        const { data: integration } = await supabase
            .from('calendar_integrations')
            .select('*')
            .eq('user_id', userId)
            .eq('is_enabled', true)
            .eq('is_connected', true)
            .single();
        
        if (integration) {
            try {
                const externalEvent = await appointmentService.createExternalAppointment(
                    integration,
                    appointment
                );
                
                if (externalEvent) {
                    await supabase
                        .from('appointments')
                        .update({
                            calendar_integration_id: integration.id,
                            external_event_id: externalEvent.id || externalEvent.uid,
                            external_event_link: externalEvent.htmlLink || externalEvent.uri,
                        })
                        .eq('id', appointment.id);
                }
            } catch (syncError) {
                console.error('Failed to sync to external calendar:', syncError);
                // Don't fail the appointment creation
            }
        }
        
        // Update campaign stats if linked
        if (campaign_id) {
            await supabase.rpc('increment', {
                table_name: 'outbound_campaigns',
                column_name: 'appointments_booked',
                row_id: campaign_id,
            }).catch(() => {});
        }
        
        // Update lead disposition if linked
        if (lead_id) {
            await supabase
                .from('campaign_leads')
                .update({
                    disposition: 'appointment',
                    appointment_date: scheduled_at,
                })
                .eq('id', lead_id)
                .catch(() => {});
        }
        
        res.status(201).json({ appointment });
    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({ error: 'Failed to create appointment' });
    }
});

/**
 * GET /api/appointments/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        const { data, error } = await supabase
            .from('appointments')
            .select('*, appointment_types(*)')
            .eq('id', id)
            .eq('user_id', userId)
            .single();
        
        if (error || !data) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        
        res.json({ appointment: data });
    } catch (error) {
        console.error('Error fetching appointment:', error);
        res.status(500).json({ error: 'Failed to fetch appointment' });
    }
});

/**
 * PUT /api/appointments/:id
 */
router.put('/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const updates = req.body;
        
        delete updates.user_id;
        delete updates.id;
        
        const { data, error } = await supabase
            .from('appointments')
            .update(updates)
            .eq('id', id)
            .eq('user_id', userId)
            .select('*, appointment_types(*)')
            .single();
        
        if (error) throw error;
        
        res.json({ appointment: data });
    } catch (error) {
        console.error('Error updating appointment:', error);
        res.status(500).json({ error: 'Failed to update appointment' });
    }
});

/**
 * POST /api/appointments/:id/reschedule
 */
router.post('/:id/reschedule', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { new_scheduled_at, new_duration_minutes, reason, notify_attendee = true } = req.body;
        
        if (!new_scheduled_at) {
            return res.status(400).json({ error: 'new_scheduled_at is required' });
        }
        
        // Get original appointment
        const { data: original, error: fetchError } = await supabase
            .from('appointments')
            .select('*, calendar_integrations(*)')
            .eq('id', id)
            .eq('user_id', userId)
            .single();
        
        if (fetchError || !original) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        
        const duration = new_duration_minutes || original.duration_minutes;
        
        // Check new slot availability
        const isAvailable = await supabase.rpc('check_slot_availability', {
            p_user_id: userId,
            p_scheduled_at: new_scheduled_at,
            p_duration_minutes: duration,
            p_exclude_appointment_id: id,
        });
        
        if (!isAvailable.data) {
            return res.status(409).json({ error: 'New time slot is not available' });
        }
        
        // Update appointment
        const { data: updated, error: updateError } = await supabase
            .from('appointments')
            .update({
                scheduled_at: new_scheduled_at,
                duration_minutes: duration,
                status: 'rescheduled',
                reschedule_count: (original.reschedule_count || 0) + 1,
            })
            .eq('id', id)
            .select('*, appointment_types(*)')
            .single();
        
        if (updateError) throw updateError;
        
        // Sync to external calendar
        if (original.external_event_id && original.calendar_integration_id) {
            const { data: integration } = await supabase
                .from('calendar_integrations')
                .select('*')
                .eq('id', original.calendar_integration_id)
                .single();
            
            if (integration) {
                try {
                    await appointmentService.rescheduleExternalAppointment(
                        integration,
                        original.external_event_id,
                        {
                            scheduledAt: new_scheduled_at,
                            durationMinutes: duration,
                            timezone: original.timezone,
                            reason,
                            notifyAttendee: notify_attendee,
                        }
                    );
                } catch (syncError) {
                    console.error('Failed to reschedule external event:', syncError);
                }
            }
        }
        
        res.json({ appointment: updated });
    } catch (error) {
        console.error('Error rescheduling appointment:', error);
        res.status(500).json({ error: 'Failed to reschedule appointment' });
    }
});

/**
 * POST /api/appointments/:id/cancel
 */
router.post('/:id/cancel', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { reason, cancelled_by = 'user', notify_attendee = true } = req.body;
        
        // Get appointment
        const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();
        
        if (fetchError || !appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        
        // Update appointment
        const { data: updated, error: updateError } = await supabase
            .from('appointments')
            .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                cancelled_by,
                cancellation_reason: reason,
            })
            .eq('id', id)
            .select()
            .single();
        
        if (updateError) throw updateError;
        
        // Cancel in external calendar
        if (appointment.external_event_id && appointment.calendar_integration_id) {
            const { data: integration } = await supabase
                .from('calendar_integrations')
                .select('*')
                .eq('id', appointment.calendar_integration_id)
                .single();
            
            if (integration) {
                try {
                    await appointmentService.cancelExternalAppointment(
                        integration,
                        appointment.external_event_id,
                        reason
                    );
                } catch (syncError) {
                    console.error('Failed to cancel external event:', syncError);
                }
            }
        }
        
        // Cancel pending reminders
        await supabase
            .from('appointment_reminders')
            .update({ status: 'cancelled' })
            .eq('appointment_id', id)
            .eq('status', 'pending');
        
        res.json({ appointment: updated });
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        res.status(500).json({ error: 'Failed to cancel appointment' });
    }
});

/**
 * POST /api/appointments/:id/confirm
 */
router.post('/:id/confirm', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { confirmed_via = 'manual' } = req.body;
        
        const { data, error } = await supabase
            .from('appointments')
            .update({
                status: 'confirmed',
                confirmed_at: new Date().toISOString(),
                confirmed_via,
            })
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({ appointment: data });
    } catch (error) {
        console.error('Error confirming appointment:', error);
        res.status(500).json({ error: 'Failed to confirm appointment' });
    }
});

/**
 * POST /api/appointments/:id/complete
 */
router.post('/:id/complete', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { outcome, outcome_status, notes } = req.body;
        
        const { data, error } = await supabase
            .from('appointments')
            .update({
                status: 'completed',
                ended_at: new Date().toISOString(),
                outcome,
                outcome_status,
                internal_notes: notes,
            })
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({ appointment: data });
    } catch (error) {
        console.error('Error completing appointment:', error);
        res.status(500).json({ error: 'Failed to complete appointment' });
    }
});

/**
 * POST /api/appointments/:id/no-show
 */
router.post('/:id/no-show', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        const { data, error } = await supabase
            .from('appointments')
            .update({
                status: 'no_show',
                ended_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({ appointment: data });
    } catch (error) {
        console.error('Error marking no-show:', error);
        res.status(500).json({ error: 'Failed to mark as no-show' });
    }
});

// ============================================
// AVAILABILITY ROUTES
// ============================================

/**
 * GET /api/appointments/availability
 * Get available time slots for booking
 */
router.get('/availability', async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            appointment_type_id,
            start_date,
            end_date,
            timezone = 'America/New_York',
        } = req.query;
        
        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'start_date and end_date are required' });
        }
        
        const result = await appointmentService.calculateAvailableSlots(supabase, userId, {
            appointmentTypeId: appointment_type_id,
            startDate: start_date,
            endDate: end_date,
            timezone,
        });
        
        res.json(result);
    } catch (error) {
        console.error('Error getting availability:', error);
        res.status(500).json({ error: 'Failed to get availability' });
    }
});

/**
 * GET /api/appointments/availability/slots
 */
router.get('/availability/slots', async (req, res) => {
    try {
        const userId = req.user.id;
        
        const { data, error } = await supabase
            .from('availability_slots')
            .select('*')
            .eq('user_id', userId)
            .order('day_of_week')
            .order('start_time');
        
        if (error) throw error;
        
        res.json({ slots: data || [] });
    } catch (error) {
        console.error('Error fetching availability slots:', error);
        res.status(500).json({ error: 'Failed to fetch availability slots' });
    }
});

/**
 * POST /api/appointments/availability/slots
 */
router.post('/availability/slots', async (req, res) => {
    try {
        const userId = req.user.id;
        const { day_of_week, start_time, end_time, appointment_type_id, is_active = true } = req.body;
        
        if (day_of_week === undefined || !start_time || !end_time) {
            return res.status(400).json({ error: 'day_of_week, start_time, and end_time are required' });
        }
        
        const { data, error } = await supabase
            .from('availability_slots')
            .insert({
                user_id: userId,
                day_of_week,
                start_time,
                end_time,
                appointment_type_id,
                is_active,
            })
            .select()
            .single();
        
        if (error) throw error;
        
        res.status(201).json({ slot: data });
    } catch (error) {
        console.error('Error creating availability slot:', error);
        res.status(500).json({ error: 'Failed to create availability slot' });
    }
});

/**
 * PUT /api/appointments/availability/slots/:id
 */
router.put('/availability/slots/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const updates = req.body;
        
        delete updates.user_id;
        
        const { data, error } = await supabase
            .from('availability_slots')
            .update(updates)
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({ slot: data });
    } catch (error) {
        console.error('Error updating availability slot:', error);
        res.status(500).json({ error: 'Failed to update availability slot' });
    }
});

/**
 * DELETE /api/appointments/availability/slots/:id
 */
router.delete('/availability/slots/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        const { error } = await supabase
            .from('availability_slots')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);
        
        if (error) throw error;
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting availability slot:', error);
        res.status(500).json({ error: 'Failed to delete availability slot' });
    }
});

/**
 * POST /api/appointments/availability/overrides
 */
router.post('/availability/overrides', async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            start_datetime,
            end_datetime,
            override_type = 'block',
            reason,
            is_recurring = false,
            recurrence_rule,
        } = req.body;
        
        if (!start_datetime || !end_datetime) {
            return res.status(400).json({ error: 'start_datetime and end_datetime are required' });
        }
        
        const { data, error } = await supabase
            .from('availability_overrides')
            .insert({
                user_id: userId,
                start_datetime,
                end_datetime,
                override_type,
                reason,
                is_recurring,
                recurrence_rule,
            })
            .select()
            .single();
        
        if (error) throw error;
        
        res.status(201).json({ override: data });
    } catch (error) {
        console.error('Error creating availability override:', error);
        res.status(500).json({ error: 'Failed to create override' });
    }
});

/**
 * GET /api/appointments/availability/overrides
 */
router.get('/availability/overrides', async (req, res) => {
    try {
        const userId = req.user.id;
        const { start_date, end_date } = req.query;
        
        let query = supabase
            .from('availability_overrides')
            .select('*')
            .eq('user_id', userId)
            .order('start_datetime');
        
        if (start_date) {
            query = query.gte('end_datetime', start_date);
        }
        if (end_date) {
            query = query.lte('start_datetime', end_date);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        res.json({ overrides: data || [] });
    } catch (error) {
        console.error('Error fetching overrides:', error);
        res.status(500).json({ error: 'Failed to fetch overrides' });
    }
});

/**
 * DELETE /api/appointments/availability/overrides/:id
 */
router.delete('/availability/overrides/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        const { error } = await supabase
            .from('availability_overrides')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);
        
        if (error) throw error;
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting override:', error);
        res.status(500).json({ error: 'Failed to delete override' });
    }
});

// ============================================
// VOICE AGENT BOOKING ENDPOINT
// ============================================

/**
 * POST /api/appointments/book-via-voice
 * Book appointment from voice agent during a call
 */
router.post('/book-via-voice', async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            appointment_type,    // Category like 'showing', 'listing_appointment'
            preferred_date,      // ISO date string
            preferred_time,      // HH:MM format
            property_address,
            attendee_name,
            attendee_phone,
            notes,
            assistant_id,
            call_id,
            lead_id,
            campaign_id,
        } = req.body;
        
        if (!appointment_type || !preferred_date || !preferred_time || !attendee_name) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: appointment_type, preferred_date, preferred_time, attendee_name',
            });
        }
        
        // Find matching appointment type
        const { data: appointmentTypes } = await supabase
            .from('appointment_types')
            .select('*')
            .eq('user_id', userId)
            .eq('category', appointment_type)
            .eq('is_active', true);
        
        const appointmentType = appointmentTypes?.[0];
        if (!appointmentType) {
            return res.status(400).json({
                success: false,
                message: `No active appointment type found for category: ${appointment_type}`,
            });
        }
        
        // Parse the scheduled time
        const scheduledAt = new Date(`${preferred_date}T${preferred_time}:00`);
        if (isNaN(scheduledAt.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date or time format',
            });
        }
        
        // Check if time is in the past
        if (scheduledAt < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Cannot book appointments in the past',
            });
        }
        
        // Check availability
        const isAvailable = await supabase.rpc('check_slot_availability', {
            p_user_id: userId,
            p_scheduled_at: scheduledAt.toISOString(),
            p_duration_minutes: appointmentType.duration_minutes,
        });
        
        if (!isAvailable.data) {
            // Get alternative slots
            const tomorrow = new Date(scheduledAt);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const weekLater = new Date(scheduledAt);
            weekLater.setDate(weekLater.getDate() + 7);
            
            const alternatives = await appointmentService.calculateAvailableSlots(
                supabase,
                userId,
                {
                    appointmentTypeId: appointmentType.id,
                    startDate: scheduledAt.toISOString(),
                    endDate: weekLater.toISOString(),
                }
            );
            
            return res.status(409).json({
                success: false,
                message: 'That time slot is not available. Here are some alternatives.',
                alternativeSlots: alternatives.slots.slice(0, 5),
            });
        }
        
        // Create the appointment
        const { data: appointment, error } = await supabase
            .from('appointments')
            .insert({
                user_id: userId,
                appointment_type_id: appointmentType.id,
                appointment_type_name: appointmentType.name,
                status: 'scheduled',
                scheduled_at: scheduledAt.toISOString(),
                duration_minutes: appointmentType.duration_minutes,
                timezone: appointmentType.settings?.timezone || 'America/New_York',
                attendee_name,
                attendee_phone,
                attendee_notes: notes,
                property_address,
                location_type: property_address ? 'property' : appointmentType.default_location || 'in_person',
                location_address: property_address || appointmentType.location_address,
                campaign_id,
                lead_id,
                call_id,
                assistant_id,
                booked_via: 'voice_agent',
                booked_by_assistant_id: assistant_id,
            })
            .select()
            .single();
        
        if (error) throw error;
        
        // Sync to external calendar (async, don't wait)
        syncToExternalCalendar(supabase, userId, appointment).catch(err => {
            console.error('Background calendar sync failed:', err);
        });
        
        res.json({
            success: true,
            appointmentId: appointment.id,
            scheduledAt: appointment.scheduled_at,
            message: `Great! I've booked your ${appointmentType.name} for ${formatDateForSpeech(scheduledAt)}. You'll receive a confirmation shortly.`,
        });
    } catch (error) {
        console.error('Error booking via voice:', error);
        res.status(500).json({
            success: false,
            message: 'Sorry, I encountered an error while booking. Please try again.',
        });
    }
});

// Helper function for voice agent
async function syncToExternalCalendar(supabase, userId, appointment) {
    const { data: integration } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('is_enabled', true)
        .eq('is_connected', true)
        .single();
    
    if (!integration) return;
    
    const externalEvent = await appointmentService.createExternalAppointment(
        integration,
        appointment
    );
    
    if (externalEvent) {
        await supabase
            .from('appointments')
            .update({
                calendar_integration_id: integration.id,
                external_event_id: externalEvent.id || externalEvent.uid,
                external_event_link: externalEvent.htmlLink || externalEvent.uri,
            })
            .eq('id', appointment.id);
    }
}

function formatDateForSpeech(date) {
    const options = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    };
    return date.toLocaleDateString('en-US', options);
}

// ============================================
// WEBHOOK ROUTES (No Auth Required)
// ============================================

/**
 * POST /api/appointments/webhooks/calcom
 * Cal.com webhook handler
 */
router.post('/webhooks/calcom', async (req, res) => {
    try {
        const { triggerEvent, payload } = req.body;
        
        console.log('Cal.com webhook received:', triggerEvent);
        
        switch (triggerEvent) {
            case 'BOOKING_CREATED':
                // Handle new booking from Cal.com
                break;
            case 'BOOKING_CANCELLED':
                // Handle cancellation
                break;
            case 'BOOKING_RESCHEDULED':
                // Handle reschedule
                break;
        }
        
        res.json({ received: true });
    } catch (error) {
        console.error('Cal.com webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

/**
 * POST /api/appointments/webhooks/calendly
 * Calendly webhook handler
 */
router.post('/webhooks/calendly', async (req, res) => {
    try {
        const { event, payload } = req.body;
        
        console.log('Calendly webhook received:', event);
        
        switch (event) {
            case 'invitee.created':
                // New booking
                break;
            case 'invitee.canceled':
                // Cancellation
                break;
        }
        
        res.json({ received: true });
    } catch (error) {
        console.error('Calendly webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

/**
 * POST /api/appointments/webhooks/google
 * Google Calendar webhook handler
 */
router.post('/webhooks/google', async (req, res) => {
    try {
        const channelId = req.headers['x-goog-channel-id'];
        const resourceState = req.headers['x-goog-resource-state'];
        
        console.log('Google Calendar webhook received:', { channelId, resourceState });
        
        if (resourceState === 'sync') {
            // Initial sync notification
            return res.json({ received: true });
        }
        
        // Handle calendar changes
        // Fetch updated events and sync
        
        res.json({ received: true });
    } catch (error) {
        console.error('Google Calendar webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

module.exports = router;

# Technical Requirements Summary

## New Database Tables
```
□ tcpa_compliance
□ tcpa_call_log
□ outbound_campaigns
□ campaign_leads
□ lead_scores
□ sms_messages
□ sms_sequences
□ voicemail_templates
□ voicemail_drops
□ n8n_webhook_configs
□ n8n_webhook_logs
□ re_script_templates (seed data)
```

---

## New Backend Services
```
□ backend/services/tcpa/
□ backend/services/outbound-dialer/
□ backend/services/lead-scoring/
□ backend/services/sms/
□ backend/services/integrations/followUpBoss/
□ backend/services/calendar/
□ backend/services/voicemail/
□ backend/routes/campaigns.js
□ backend/routes/leads.js
□ backend/routes/sms.js
□ backend/routes/webhooks.js
```

---

## New Frontend Pages
```
□ frontend/pages/Campaigns.tsx
□ frontend/pages/CampaignEditor.tsx
□ frontend/pages/CampaignDashboard.tsx
□ frontend/pages/REDashboard.tsx
□ frontend/pages/real-estate/ (landing page)
□ frontend/pages/Settings/integrations/FollowUpBossSetup.tsx
```

---

## New Frontend Components
```
□ frontend/components/campaigns/*
□ frontend/components/compliance/*
□ frontend/components/re-analytics/*
□ frontend/components/assistant-editor/REScriptSelector.tsx
□ frontend/components/assistant-editor/REScriptCustomizer.tsx
```

---

## External Integrations
```
□ Twilio AMD (Answering Machine Detection)
□ Twilio SMS
□ Follow Up Boss API
□ Cal.com / Calendly API
□ N8N Webhooks (self-hosted)
□ DNC Registry API
```

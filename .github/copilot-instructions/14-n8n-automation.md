# N8N Marketing Automation Integration

## Why N8N?
- Self-hosted (data privacy)
- Visual workflow builder
- 400+ integrations
- Cheaper than Zapier at scale
- Can run complex RE marketing sequences

---

## N8N Webhooks Setup

**Voicory → N8N Webhook Events:**
```javascript
// backend/routes/webhooks.js - Outbound events for N8N
const WEBHOOK_EVENTS = [
  'call.started',
  'call.completed',
  'call.failed',
  'lead.created',
  'lead.qualified',
  'lead.scored',
  'appointment.booked',
  'appointment.cancelled',
  'campaign.started',
  'campaign.completed',
  'sms.received',
  'transfer.requested',
  'transfer.completed'
];

// User configures webhook URL (n8n endpoint)
// POST /api/settings/webhooks
{
  "url": "https://n8n.yourdomain.com/webhook/voicory",
  "events": ["call.completed", "lead.qualified", "appointment.booked"],
  "secret": "webhook-signing-secret"
}
```

---

## N8N Workflows for Real Estate

### Workflow 1: Lead Capture → Campaign Assignment
```
Trigger: Webhook from Zillow/Realtor.com lead form
    ↓
[HTTP Request] Check DNC status via Voicory API
    ↓
[IF] Not on DNC?
    ↓ Yes
[HTTP Request] POST to Voicory /api/leads/create
    ↓
[HTTP Request] Add to active FSBO campaign
    ↓
[Slack/Email] Notify agent of new lead
```

### Workflow 2: Post-Call Follow-up Sequence
```
Trigger: Webhook from Voicory (call completed)
    ↓
[Switch] Based on call outcome
    ↓
Case: "voicemail"
    → [Wait 4 hours]
    → [HTTP Request] Send SMS via Voicory
    → [Wait 24 hours]
    → [HTTP Request] Trigger callback campaign
    
Case: "interested"
    → [HTTP Request] Add to Follow Up Boss
    → [HTTP Request] Create FUB task for agent
    → [Email] Send property info to lead
    → [Calendar] Block time for appointment

Case: "not_interested"
    → [HTTP Request] Update lead status
    → [Wait 30 days]
    → [HTTP Request] Add to nurture campaign
```

### Workflow 3: Appointment Reminder Sequence
```
Trigger: Scheduled (every hour)
    ↓
[HTTP Request] GET appointments in next 24 hours
    ↓
[Loop] For each appointment
    ↓
[IF] 24 hours away?
    → [HTTP Request] Send reminder SMS
    → [Email] Send calendar reminder
    
[IF] 1 hour away?
    → [HTTP Request] Send SMS with agent contact
    → [HTTP Request] Alert agent via Slack
```

### Workflow 4: Expired Listing Auto-Campaign
```
Trigger: Daily at 7am
    ↓
[HTTP Request] Pull new expired listings from MLS API
    ↓
[Loop] For each expired listing
    ↓
[HTTP Request] Check if already in system
    ↓
[IF] New lead?
    → [HTTP Request] Create lead in Voicory
    → [HTTP Request] Add to "Expired" campaign
    → [Wait until 9am local time]
    → [HTTP Request] Queue first call
```

### Workflow 5: Hot Lead Alert System
```
Trigger: Webhook from Voicory (lead.scored)
    ↓
[IF] Score >= 80?
    → [Slack] Send to #hot-leads channel
    → [SMS to Agent] "🔥 HOT LEAD: {name} scored {score}. Call NOW!"
    → [Email] Send lead summary to agent
    → [HTTP Request] Move to priority queue
    → [Wait 15 min]
    → [IF] Not contacted?
        → [SMS to Broker] "Hot lead not followed up: {name}"
```

### Workflow 6: Weekly Performance Report
```
Trigger: Every Monday at 8am
    ↓
[HTTP Request] GET /api/analytics/weekly-summary
    ↓
[Code Node] Format metrics into HTML report
    ↓
[Email] Send to all agents + broker
    ↓
[Slack] Post summary to #weekly-stats
    ↓
[Google Sheets] Append to tracking spreadsheet
```

---

## N8N Database (for workflow state)
```sql
-- n8n_webhook_configs table
CREATE TABLE n8n_webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  webhook_url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  secret TEXT,
  active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- n8n_webhook_logs table (for debugging)
CREATE TABLE n8n_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_config_id UUID REFERENCES n8n_webhook_configs(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);
```

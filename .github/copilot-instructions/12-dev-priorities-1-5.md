# Development Priority Plan (1-10)

## Priority 1: TCPA Compliance Module ⚠️ LEGAL BLOCKER
**Timeline:** Week 1-2 | **Effort:** 2-3 weeks | **Status:** 🔴 Not Started

**Why First:** Cannot do ANY outbound calling without this. Legal risk = company killer.

**Features Required:**
```
□ Time-of-day restrictions (8am-9pm recipient's local time)
□ DNC (Do Not Call) registry integration
□ State-specific rules engine (CA, FL, NY stricter)
□ Consent capture & logging (written consent proof)
□ Call recording disclosure ("This call may be recorded...")
□ Opt-out mechanism ("Press 9 to be removed")
□ Audit trail for compliance proof
```

**Database Schema:**
```sql
-- tcpa_compliance table
CREATE TABLE tcpa_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  phone_number TEXT NOT NULL,
  consent_type TEXT NOT NULL, -- 'written', 'verbal', 'implied'
  consent_source TEXT, -- 'web_form', 'manual_entry', 'crm_import'
  consent_date TIMESTAMPTZ NOT NULL,
  consent_proof_url TEXT, -- S3 link to consent document
  dnc_status BOOLEAN DEFAULT FALSE,
  dnc_added_date TIMESTAMPTZ,
  state TEXT, -- For state-specific rules
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- tcpa_call_log for audit trail
CREATE TABLE tcpa_call_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES outbound_campaigns(id),
  phone_number TEXT NOT NULL,
  call_time TIMESTAMPTZ NOT NULL,
  recipient_timezone TEXT NOT NULL,
  recipient_local_time TIME NOT NULL,
  tcpa_compliant BOOLEAN NOT NULL,
  compliance_checks JSONB, -- {time_check: true, dnc_check: true, consent_check: true}
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Files to Create:**
```
backend/services/tcpa/
├── index.js              # Main TCPA service
├── timeRestrictions.js   # 8am-9pm local time logic
├── dncRegistry.js        # DNC list integration
├── consentManager.js     # Consent capture/verification
└── stateRules.js         # State-specific compliance

frontend/components/compliance/
├── ConsentCapture.tsx    # Consent form component
├── DNCChecker.tsx        # Check number against DNC
└── ComplianceSettings.tsx # User compliance config
```

---

## Priority 2: Real Estate Script Templates
**Timeline:** Week 1-2 | **Effort:** 1 week | **Status:** 🔴 Not Started

**5 Core Scripts:**

| Script | Use Case | Key Variables |
|--------|----------|---------------|
| **FSBO Outbound** | Call For Sale By Owner leads | `{owner_name}`, `{property_address}`, `{days_on_market}` |
| **Expired Listing** | Call expired MLS listings | `{owner_name}`, `{address}`, `{days_expired}`, `{original_price}` |
| **Buyer Inquiry (Inbound)** | Answer calls about listings | `{property_address}`, `{price}`, `{bedrooms}`, `{agent_name}` |
| **Seller Follow-up** | Follow up with potential sellers | `{owner_name}`, `{last_contact_date}`, `{timeline}` |
| **Open House Follow-up** | Call open house visitors | `{visitor_name}`, `{property_address}`, `{visit_date}` |

**Script Template Structure:**
```typescript
interface REScript {
  id: string;
  name: string;
  category: 'fsbo' | 'expired' | 'buyer_inquiry' | 'seller_followup' | 'open_house';
  direction: 'inbound' | 'outbound';
  systemPrompt: string;
  firstMessage: string;
  qualificationQuestions: string[];
  objectionHandlers: Record<string, string>;
  appointmentBookingTrigger: string;
  transferTrigger: string;
  variables: string[];
}
```

**Example FSBO Script:**
```
System Prompt:
You are a friendly real estate assistant calling on behalf of {agent_name} 
from {brokerage_name}. You're reaching out to {owner_name} about their 
property at {property_address} that's currently for sale by owner.

Your goals:
1. Build rapport and understand their selling timeline
2. Discover their motivation for selling FSBO
3. Qualify their interest in professional representation
4. Book an appointment if they're open to meeting

First Message:
"Hi, is this {owner_name}? Great! This is an assistant calling on behalf 
of {agent_name} with {brokerage_name}. I noticed your beautiful home at 
{property_address} is for sale. I'm not calling to pressure you - just 
wanted to see how things are going with your sale. Have you been getting 
much interest?"

Qualification Questions:
- "What's your timeline for selling?"
- "Have you had any offers yet?"
- "What made you decide to sell on your own?"
- "Would you be open to a quick chat with {agent_name} just to get a 
  professional market analysis - no obligation?"

Objection Handlers:
- "I'm not interested in agents": "I totally understand. Many homeowners 
  feel that way. {agent_name} actually specializes in helping FSBOs who 
  just want a second opinion on pricing. Would a free market analysis 
  be helpful, even if you continue selling on your own?"
```

**Files to Create:**
```
frontend/data/reScriptTemplates.ts    # Script definitions
frontend/components/assistant-editor/
├── REScriptSelector.tsx              # Choose RE script
├── REScriptCustomizer.tsx            # Customize variables
└── REScriptPreview.tsx               # Preview the script
```

---

## Priority 3: Outbound Dialer / Campaign System
**Timeline:** Week 3-4 | **Effort:** 3-4 weeks | **Status:** 🔴 Not Started

**Core Features:**
```
□ Lead list upload (CSV with name, phone, address, etc.)
□ Campaign creation with script assignment
□ Call scheduling (set start/end time, days of week)
□ Pacing control (calls per hour limit)
□ Call queue management
□ Real-time campaign dashboard
□ Pause/resume campaigns
□ A/B test different scripts
```

**Database Schema:**
```sql
-- outbound_campaigns table
CREATE TABLE outbound_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  assistant_id UUID REFERENCES assistants(id),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft', -- draft, active, paused, completed
  campaign_type TEXT NOT NULL, -- fsbo, expired, circle_prospecting, followup
  
  -- Scheduling
  start_date DATE,
  end_date DATE,
  call_days TEXT[], -- ['monday', 'tuesday', ...]
  call_start_time TIME DEFAULT '09:00',
  call_end_time TIME DEFAULT '20:00',
  timezone TEXT DEFAULT 'America/New_York',
  
  -- Pacing
  max_calls_per_hour INTEGER DEFAULT 50,
  max_calls_per_day INTEGER DEFAULT 500,
  max_concurrent_calls INTEGER DEFAULT 5,
  
  -- Stats
  total_leads INTEGER DEFAULT 0,
  calls_made INTEGER DEFAULT 0,
  calls_answered INTEGER DEFAULT 0,
  appointments_booked INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- campaign_leads table
CREATE TABLE campaign_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES outbound_campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  
  -- Lead info
  phone_number TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  property_address TEXT,
  property_city TEXT,
  property_state TEXT,
  property_zip TEXT,
  
  -- RE-specific fields
  lead_source TEXT, -- fsbo, expired, zillow, realtor.com, manual
  days_on_market INTEGER,
  listing_price DECIMAL,
  original_list_date DATE,
  expiration_date DATE,
  
  -- Call status
  status TEXT DEFAULT 'pending', -- pending, calling, completed, failed, dnc, callback
  call_attempts INTEGER DEFAULT 0,
  last_call_at TIMESTAMPTZ,
  next_call_at TIMESTAMPTZ,
  
  -- Outcome
  outcome TEXT, -- answered, voicemail, no_answer, busy, disconnected
  disposition TEXT, -- hot, warm, cold, not_interested, callback, dnc
  notes TEXT,
  appointment_date TIMESTAMPTZ,
  
  -- Metadata
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE outbound_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_leads ENABLE ROW LEVEL SECURITY;
```

**Backend Architecture:**
```
backend/services/outbound-dialer/
├── index.js                 # Main dialer orchestrator
├── campaignManager.js       # Campaign CRUD + lifecycle
├── callQueue.js             # Redis-based call queue
├── dialer.js                # Twilio outbound call logic
├── scheduler.js             # Cron jobs for scheduled campaigns
├── leadProcessor.js         # CSV upload + lead normalization
└── outcomeTracker.js        # Track call outcomes

backend/routes/
├── campaigns.js             # Campaign API endpoints
└── leads.js                 # Lead management endpoints
```

**Frontend Pages:**
```
frontend/pages/
├── Campaigns.tsx            # Campaign list view
├── CampaignEditor.tsx       # Create/edit campaign
├── CampaignDashboard.tsx    # Real-time campaign stats
└── LeadUpload.tsx           # CSV upload interface

frontend/components/campaigns/
├── CampaignCard.tsx
├── LeadTable.tsx
├── CampaignStats.tsx
├── CallQueue.tsx
└── LeadImportModal.tsx
```

---

## Priority 4: Lead Scoring & Qualification
**Timeline:** Week 5-6 | **Effort:** 1-2 weeks | **Status:** 🔴 Not Started

**Scoring Model:**
```typescript
interface LeadScore {
  overall: number;        // 0-100
  timeline: 'immediate' | '1-3months' | '3-6months' | '6months+' | 'unknown';
  motivation: 'high' | 'medium' | 'low' | 'unknown';
  priceAlignment: boolean;
  preApproved: boolean;   // For buyers
  mustSell: boolean;      // For sellers (relocation, divorce, etc.)
}

// Scoring rules
const scoringRules = {
  timeline: {
    immediate: 30,
    '1-3months': 25,
    '3-6months': 15,
    '6months+': 5,
    unknown: 0
  },
  motivation: {
    high: 25,    // "We need to sell ASAP"
    medium: 15,  // "We're exploring options"
    low: 5,      // "Just curious about value"
    unknown: 0
  },
  priceAlignment: 15,      // Expectations match market
  preApproved: 10,         // Buyer is pre-approved
  mustSell: 20,            // Life event forcing sale
  appointmentBooked: 30    // Agreed to meet
};
```

**AI-Powered Qualification:**
```
Post-Call Analysis Prompt:
"Analyze this call transcript and extract:
1. Selling/buying timeline (immediate, 1-3mo, 3-6mo, 6mo+)
2. Motivation level (high, medium, low)
3. Key objections mentioned
4. Interest in meeting with agent (yes, maybe, no)
5. Any life events mentioned (relocation, divorce, inheritance, etc.)
6. Price expectations vs market reality

Return JSON format."
```

**Database:**
```sql
-- lead_scores table
CREATE TABLE lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES campaign_leads(id),
  call_id UUID REFERENCES call_logs(id),
  
  overall_score INTEGER,
  timeline TEXT,
  motivation TEXT,
  price_alignment BOOLEAN,
  pre_approved BOOLEAN,
  must_sell BOOLEAN,
  
  objections TEXT[],
  key_insights TEXT,
  recommended_action TEXT,
  
  ai_analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Priority 5: Follow Up Boss CRM Integration
**Timeline:** Week 7-8 | **Effort:** 2-3 weeks | **Status:** 🔴 Not Started

**Why Follow Up Boss First:**
- #1 RE CRM by market share
- Modern REST API
- Webhook support
- Used by serious brokerages (our ICP)

**Integration Features:**
```
□ OAuth connection flow
□ Bi-directional contact sync
□ Push call outcomes to FUB
□ Pull leads from FUB for campaigns
□ Create FUB tasks after calls
□ Log call recordings to contact
□ Trigger FUB action plans
□ Sync appointments to FUB calendar
```

**API Endpoints to Implement:**
```javascript
// Follow Up Boss API integration
const FUB_API = {
  // Contacts
  getContacts: 'GET /v1/people',
  createContact: 'POST /v1/people',
  updateContact: 'PUT /v1/people/{id}',
  
  // Notes/Activities
  addNote: 'POST /v1/notes',
  addCall: 'POST /v1/calls',
  
  // Tasks
  createTask: 'POST /v1/tasks',
  
  // Webhooks
  registerWebhook: 'POST /v1/webhooks',
  
  // Action Plans
  triggerActionPlan: 'POST /v1/people/{id}/actionPlans'
};
```

**Files to Create:**
```
backend/services/integrations/
├── followUpBoss/
│   ├── index.js          # Main FUB service
│   ├── auth.js           # OAuth flow
│   ├── contacts.js       # Contact sync
│   ├── activities.js     # Log calls/notes
│   ├── webhooks.js       # Receive FUB events
│   └── actionPlans.js    # Trigger automations

frontend/pages/Settings/
├── Integrations.tsx      # Integration hub
└── integrations/
    └── FollowUpBossSetup.tsx
```

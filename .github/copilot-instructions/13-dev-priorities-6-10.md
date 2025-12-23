# Development Priority Plan (6-10)

## Priority 6: Appointment Booking Integration
**Timeline:** Week 8-9 | **Effort:** 2 weeks | **Status:** 🔴 Not Started

**Integration Options:**
| Platform | Complexity | Notes |
|----------|------------|-------|
| **Cal.com** | Easy | Open-source, good API |
| **Calendly** | Easy | Popular, good API |
| **Google Calendar** | Medium | Direct integration |
| **Follow Up Boss Calendar** | Medium | Native to CRM |

**Features:**
```
□ Real-time availability check during call
□ Book appointment via voice command
□ Send confirmation SMS/email
□ Add to agent's calendar
□ Reminder sequence (24hr, 1hr before)
□ Reschedule/cancel handling
□ Sync to FUB if connected
```

**Voice Agent Tool:**
```typescript
const appointmentBookingTool = {
  name: 'book_appointment',
  description: 'Book a showing or meeting with the real estate agent',
  parameters: {
    type: 'object',
    properties: {
      appointment_type: {
        type: 'string',
        enum: ['showing', 'listing_appointment', 'buyer_consultation', 'market_analysis']
      },
      preferred_date: { type: 'string', description: 'ISO date string' },
      preferred_time: { type: 'string', description: 'HH:MM format' },
      property_address: { type: 'string' },
      notes: { type: 'string' }
    },
    required: ['appointment_type', 'preferred_date', 'preferred_time']
  }
};
```

---

## Priority 7: SMS Channel & Sequences
**Timeline:** Week 9-10 | **Effort:** 1-2 weeks | **Status:** 🔴 Not Started

**Why SMS:**
- 98% open rate (vs 20% email)
- Follow-up after voicemail
- Appointment reminders
- Property alerts

**Sequence Logic:**
```
Voice Call (No Answer)
    ↓ (immediate)
SMS: "Hi {name}, I just tried calling about {address}. 
      Call me back at {number} or reply YES to this text."
    ↓ (4 hours, no response)
SMS: "Just following up - did you get my message about {address}? 
      Reply STOP to opt out."
    ↓ (24 hours, no response)
Voice Call Attempt #2
    ↓ (no answer)
SMS: "Last try! {agent_name} wanted to discuss {address}. 
      Reply CALL and we'll reach out one more time."
    ↓ (48 hours, no response)
Mark as Cold, move to nurture sequence
```

**Database:**
```sql
-- sms_messages table
CREATE TABLE sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  campaign_id UUID REFERENCES outbound_campaigns(id),
  lead_id UUID REFERENCES campaign_leads(id),
  
  direction TEXT NOT NULL, -- inbound, outbound
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  body TEXT NOT NULL,
  
  status TEXT DEFAULT 'queued', -- queued, sent, delivered, failed
  twilio_sid TEXT,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- sms_sequences table
CREATE TABLE sms_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  trigger TEXT NOT NULL, -- voicemail, no_answer, callback_requested
  steps JSONB NOT NULL, -- [{delay_hours: 0, message: "..."}]
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Priority 8: Voicemail Detection & Drop
**Timeline:** Week 10-11 | **Effort:** 1-2 weeks | **Status:** 🔴 Not Started

**Twilio AMD (Answering Machine Detection):**
```javascript
// Outbound call with AMD
const call = await twilioClient.calls.create({
  to: leadPhone,
  from: twilioNumber,
  url: `${BACKEND_URL}/api/outbound/voice-handler`,
  machineDetection: 'DetectMessageEnd', // Wait for beep
  machineDetectionTimeout: 30,
  machineDetectionSpeechThreshold: 2400,
  machineDetectionSpeechEndThreshold: 1200,
  machineDetectionSilenceTimeout: 5000,
  asyncAmd: true,
  asyncAmdStatusCallback: `${BACKEND_URL}/api/outbound/amd-callback`
});

// AMD Callback Handler
app.post('/api/outbound/amd-callback', async (req, res) => {
  const { CallSid, AnsweredBy } = req.body;
  // AnsweredBy: 'human', 'machine_start', 'machine_end_beep', 
  //             'machine_end_silence', 'machine_end_other', 'fax', 'unknown'
  
  if (AnsweredBy === 'human') {
    // Connect to AI agent
    await connectToVoiceAgent(CallSid);
  } else if (AnsweredBy.startsWith('machine_end')) {
    // Drop pre-recorded voicemail
    await dropVoicemail(CallSid, leadId);
  }
});
```

**Voicemail Drop Feature:**
```typescript
interface VoicemailTemplate {
  id: string;
  name: string;
  audioUrl: string;        // Pre-recorded audio file
  duration: number;        // seconds
  transcript: string;      // For logging
  category: 'fsbo' | 'expired' | 'followup' | 'general';
}

// Voicemail recording flow
const dropVoicemail = async (callSid: string, templateId: string) => {
  const template = await getVoicemailTemplate(templateId);
  
  // Play pre-recorded message after beep
  await twilioClient.calls(callSid).update({
    twiml: `<Response>
      <Pause length="1"/>
      <Play>${template.audioUrl}</Play>
      <Hangup/>
    </Response>`
  });
  
  // Log the voicemail drop
  await logVoicemailDrop(callSid, templateId);
};
```

**Database:**
```sql
-- voicemail_templates table
CREATE TABLE voicemail_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  audio_duration INTEGER, -- seconds
  transcript TEXT,
  variables TEXT[], -- Variables in the recording
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- voicemail_drops table (tracking)
CREATE TABLE voicemail_drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES outbound_campaigns(id),
  lead_id UUID REFERENCES campaign_leads(id),
  template_id UUID REFERENCES voicemail_templates(id),
  call_sid TEXT,
  dropped_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Priority 9: Real Estate Analytics Dashboard
**Timeline:** Week 11-12 | **Effort:** 2-3 weeks | **Status:** 🔴 Not Started

**Key Metrics:**
```
Campaign Performance:
- Calls made today/this week/this month
- Answer rate % (answered / attempted)
- Conversation rate % (30+ sec calls / answered)
- Appointment rate % (appointments / conversations)
- Cost per appointment

Lead Funnel:
- Total leads → Called → Answered → Qualified → Appointment → Listing/Sale

Agent Performance:
- Leads assigned per agent
- Follow-up compliance
- Appointment show rate

ROI Calculator:
- Hours saved vs manual dialing
- Cost comparison vs ISA salary
- Revenue from appointments booked
```

**Dashboard Components:**
```
frontend/pages/REDashboard.tsx         # Main RE dashboard
frontend/components/re-analytics/
├── CampaignMetrics.tsx               # Campaign stats cards
├── LeadFunnel.tsx                    # Visual funnel
├── CallActivityChart.tsx             # Calls over time
├── AnswerRateGauge.tsx               # Answer rate visualization
├── AppointmentCalendar.tsx           # Upcoming appointments
├── ROICalculator.tsx                 # ROI comparison tool
└── LeaderboardTable.tsx              # Top performing campaigns
```

---

## Priority 10: Human Escalation / Live Transfer
**Timeline:** Week 12-13 | **Effort:** 2 weeks | **Status:** 🔴 Not Started

**Transfer Triggers:**
```
□ Lead says "speak to agent" or similar
□ Lead is scored as "hot" (high motivation + immediate timeline)
□ Lead has objections AI can't handle
□ Lead wants to make an offer
□ AI confidence score drops below threshold
```

**Transfer Flow:**
```
1. AI detects transfer trigger
2. AI: "Great! Let me connect you with {agent_name} right now. 
        One moment please..."
3. Play hold music
4. Simultaneously:
   - Call agent's cell phone
   - Send SMS: "HOT LEAD CALLING: {name} about {address}"
   - Push notification to app
5. If agent answers: "You have a hot lead on the line about {address}. 
                       They're interested in {summary}. Connecting now."
6. Merge calls (conference)
7. If agent doesn't answer in 30 sec:
   - AI returns: "I apologize, {agent_name} is with another client. 
                  Can I schedule a callback for you?"
   - Book callback appointment
   - Send agent notification with lead details
```

**Implementation:**
```javascript
// Transfer tool for voice agent
const transferTool = {
  name: 'transfer_to_agent',
  description: 'Transfer the call to a live agent',
  handler: async (params, callContext) => {
    const { reason, leadSummary } = params;
    const { callSid, agentPhone, agentName } = callContext;
    
    // Notify agent
    await sendSMS(agentPhone, 
      `🔥 HOT LEAD: ${leadSummary.name} calling about ${leadSummary.address}. Transferring now!`);
    
    // Create conference
    const conference = await twilioClient.conferences.create({
      friendlyName: `transfer-${callSid}`,
    });
    
    // Add current call to conference (with hold music)
    await twilioClient.calls(callSid).update({
      twiml: `<Response>
        <Dial>
          <Conference waitUrl="/hold-music.xml">${conference.sid}</Conference>
        </Dial>
      </Response>`
    });
    
    // Call agent and add to conference
    const agentCall = await twilioClient.calls.create({
      to: agentPhone,
      from: twilioNumber,
      url: `${BACKEND_URL}/api/transfer/agent-connect?conference=${conference.sid}&summary=${encodeURIComponent(JSON.stringify(leadSummary))}`,
      timeout: 30
    });
    
    return { status: 'transferring', conferenceId: conference.sid };
  }
};
```

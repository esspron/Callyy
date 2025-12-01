# 🎯 Voicory Admin Dashboard - Founder's Command Center

## Current Status: 🟢 Phase 2 Complete (P&L Analytics)

---

## ✅ COMPLETED FEATURES

### Security
- [x] Passkey authentication with environment variable
- [x] Rate limiting (5 attempts, 15 min lockout)
- [x] Timing-safe passkey comparison
- [x] Session tokens with 30 min timeout
- [x] Localhost-only access
- [x] Service role key for full DB access

### Dashboard Home (Phase 1 - COMPLETE)
- [x] Real revenue chart from `credit_transactions`
- [x] Real user growth tracking
- [x] Calculate actual trends vs previous period
- [x] Date range selector (7d/14d/30d/90d)
- [x] Auto-refresh every 60 seconds
- [x] Financial Overview section (P&L at a glance)
- [x] Gross Revenue, Platform Costs, Gross Profit display
- [x] Credits Outstanding (deferred revenue)
- [x] ARPU (Average Revenue Per User)

### P&L Analytics (Phase 2 - COMPLETE)
- [x] Full Profit & Loss statement page
- [x] Real-time pulse (Today's revenue, costs, MTD, run rate)
- [x] Revenue section with refunds tracking
- [x] COGS breakdown (LLM, TTS, STT, Telephony costs)
- [x] Gross Profit & Gross Margin calculation
- [x] Operating Expenses section (Infrastructure, Payment Gateway)
- [x] Net Operating Profit with margin
- [x] Historical P&L trend table
- [x] Provider costs management (add/delete actual expenses)
- [x] `provider_costs` database table
- [x] `monthly_financials` database table with auto-aggregation function
- [x] `usage_logs` extended with `provider_cost_inr` and `margin_inr` columns

### Pages Implemented
- [x] Dashboard Home (enhanced with real data)
- [x] **P&L Analytics** (NEW - end-to-end financials)
- [x] User Manager (view, search, credit adjustment)
- [x] Revenue Analytics (transactions, charts)
- [x] Usage Analytics (LLM/TTS/STT costs)
- [x] Coupon Manager
- [x] Referral Manager
- [x] Assistant Manager
- [x] Voice Library Admin
- [x] LLM Pricing Manager
- [x] WhatsApp Manager
- [x] Phone Number Manager
- [x] System Logs
- [x] Settings

---

## ✅ P&L / Financial Overview - COMPLETE

### 1. **Profit & Loss Dashboard** ✅
- [x] **Revenue Section**
  - Total purchases/top-ups by users
  - Revenue by period (monthly view with selector)
  - Refunds tracking
  - Net Revenue calculation
  
- [x] **Costs Section** (What YOU pay to providers)
  - LLM Costs (OpenAI, etc.)
  - TTS Costs (ElevenLabs)
  - STT Costs (Deepgram)
  - Telephony Costs (Twilio)
  - Infrastructure costs (Railway, Supabase, Redis)
  - Payment gateway fees
  
- [x] **Profit Calculation**
  - Gross Profit = Net Revenue - COGS
  - Gross Margin %
  - Operating Profit (after OpEx)
  - Operating Margin %

- [x] **Deferred Revenue / Liability**
  - Credits outstanding displayed on Dashboard Home

### 2. **Provider Cost Tracking** ✅
- [x] Created `provider_costs` table
- [x] Created `monthly_financials` table
- [x] UI to add/delete provider costs
- [x] Extended `usage_logs` for margin tracking
- [x] Default margin estimates when actual costs unknown

---

## 🟡 MEDIUM PRIORITY - Missing Insights

### 3. **Customer Analytics**
- [ ] Customer Lifetime Value (CLV)
- [ ] Churn rate tracking
- [ ] Active vs Inactive users
- [ ] User engagement score
- [ ] Top spending customers

### 4. **Product Analytics**
- [ ] Most used assistants
- [ ] Most used voices
- [ ] Popular LLM models
- [ ] Feature usage tracking
- [ ] WhatsApp vs Voice call distribution

### 5. **Funnel Analytics**
- [ ] Signup → First top-up conversion
- [ ] Trial → Paid conversion
- [ ] User activation rate
- [ ] Feature adoption rates

---

## 🟢 LOW PRIORITY - Nice to Have

### 6. **Alerts & Notifications**
- [ ] Low balance alerts
- [ ] High usage alerts
- [ ] Unusual activity detection
- [ ] System health alerts

### 7. **Export & Reports**
- [ ] Daily/Weekly summary emails
- [ ] PDF report generation
- [ ] Scheduled exports
- [ ] Custom date range exports

### 8. **Team Access**
- [ ] Multiple admin users
- [ ] Role-based permissions
- [ ] Audit log for admin actions

---

## 📊 KEY METRICS FOR FOUNDER

| Metric | Current Value | Source |
|--------|---------------|--------|
| Total Users | 1 | ✅ Tracked |
| Total Revenue | ₹0 | ✅ Tracked (from purchases) |
| Credits Outstanding | ₹3,021.76 | ✅ Tracked |
| Platform Costs | ₹28.27 | ✅ Tracked (usage_logs) |
| Gross Profit | ₹-28.27 | ❌ Need to calculate |
| Active Assistants | 1 | ✅ Tracked |
| WhatsApp Messages | 99 | ✅ Tracked |
| Phone Calls | 0 | ✅ Tracked |

---

## 🚀 IMPLEMENTATION ORDER

### Phase 1: Fix Dashboard Home (TODAY)
1. Replace mock data with real data
2. Add real trend calculations
3. Add date range selector
4. Fix revenue chart

### Phase 2: P&L Dashboard (THIS WEEK)
1. Create new P&L page
2. Add revenue tracking
3. Add cost tracking
4. Calculate profit margins

### Phase 3: Enhanced Analytics (NEXT WEEK)
1. Customer analytics
2. Product analytics
3. Funnel tracking

### Phase 4: Polish (LATER)
1. Alerts system
2. Report generation
3. Team access

---

## 🏗️ DATABASE CHANGES NEEDED

```sql
-- Track actual provider costs (what Voicory pays)
CREATE TABLE provider_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL, -- 'openai', 'elevenlabs', 'deepgram', 'twilio'
    service_type TEXT NOT NULL, -- 'llm', 'tts', 'stt', 'telephony'
    usage_log_id UUID REFERENCES usage_logs(id),
    our_cost DECIMAL NOT NULL, -- What we pay the provider
    user_charge DECIMAL NOT NULL, -- What we charge the user
    margin DECIMAL GENERATED ALWAYS AS (user_charge - our_cost) STORED,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Monthly financial summaries
CREATE TABLE monthly_financials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month DATE NOT NULL UNIQUE, -- First day of month
    total_revenue DECIMAL DEFAULT 0,
    total_provider_costs DECIMAL DEFAULT 0,
    total_infrastructure_costs DECIMAL DEFAULT 0,
    gross_profit DECIMAL GENERATED ALWAYS AS (total_revenue - total_provider_costs) STORED,
    net_profit DECIMAL GENERATED ALWAYS AS (total_revenue - total_provider_costs - total_infrastructure_costs) STORED,
    new_users INTEGER DEFAULT 0,
    churned_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 📝 NOTES

- Current data shows ₹3,021.76 credits given (likely welcome bonus + coupons)
- No actual purchases yet (revenue = ₹0)
- Platform costs already tracked in `usage_logs.cost_inr`
- Need to differentiate between "what user pays" vs "what we pay provider"

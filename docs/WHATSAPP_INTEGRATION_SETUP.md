# WhatsApp Business Integration Setup Guide

This guide explains how to set up the WhatsApp Business Cloud API integration for chatbot and calling features.

## Connection Methods

Callyy supports **two methods** to connect your WhatsApp Business account:

| Method | Best For | Setup Time | Technical Level |
|--------|----------|------------|-----------------|
| **Facebook Login (OAuth)** | Quick setup, automatic onboarding | ~2 minutes | Easy |
| **Manual Setup** | Existing API access, advanced users | ~10 minutes | Intermediate |

---

## Method 1: Facebook Login (Embedded Signup) - Recommended

This method uses Facebook's Embedded Signup to automatically create and configure your WhatsApp Business account.

### Prerequisites for OAuth Method

1. A **Facebook account** connected to your business
2. A phone number that can receive SMS (for verification)

### Setup Steps

1. Go to **Messenger > WhatsApp** in your Callyy dashboard
2. Click **Connect WhatsApp Business**
3. Select **"Quick Setup with Facebook"**
4. Click **"Login with Facebook"**
5. In the popup window:
   - Log in to your Facebook account
   - Grant the requested permissions:
     - `whatsapp_business_management`
     - `whatsapp_business_messaging`
   - Select or create a WhatsApp Business Account
   - Select or add a phone number
   - Verify the phone number via SMS
6. The connection will be automatically configured!

### For Developers: Setting Up Facebook Embedded Signup

If you're deploying your own instance, you need to configure the Facebook App:

#### Step 1: Create Facebook App

1. Go to [Meta for Developers](https://developers.facebook.com/apps/)
2. Click **Create App** > **Other** > **Business**
3. Fill in details and create the app

#### Step 2: Add Facebook Login for Business

1. In your app, go to **Add Product**
2. Add **Facebook Login for Business**
3. Configure OAuth settings:
   - **Valid OAuth Redirect URIs**: `https://your-domain.com/messenger/whatsapp`
   - **Deauthorize Callback URL**: `https://your-domain.com/api/webhooks/facebook/deauthorize`

#### Step 3: Add WhatsApp Product

1. Add **WhatsApp** product
2. Configure for Embedded Signup:
   - Enable **Embedded Signup**
   - Set **Callback URL**: `https://your-domain.com/api/webhooks/whatsapp`

#### Step 4: Create Embedded Signup Configuration

1. Go to **WhatsApp > Embedded Signup**
2. Click **Create Configuration**
3. Configure:
   - **Configuration Name**: "Callyy WhatsApp Signup"
   - **Phone Number**: Include phone number in flow ✅
   - **WhatsApp Business Account**: Include WABA ✅
4. Copy the **Configuration ID**

#### Step 5: Environment Variables

Add these to your `.env.local`:

```env
# Facebook App Configuration
VITE_FACEBOOK_APP_ID=your_facebook_app_id
VITE_FACEBOOK_CONFIG_ID=your_embedded_signup_config_id
```

---

## Method 2: Manual Setup

For users who already have API access or prefer manual configuration.

### Prerequisites

1. A **Meta Business Account** - [Create one here](https://business.facebook.com/)
2. A **Meta for Developers account** - [Sign up here](https://developers.facebook.com/)
3. A **WhatsApp Business phone number** (can be your existing business number)
4. Your business must have a messaging limit of at least **2,000 messages/day** for calling features

### Setup Steps

### Step 1: Create a Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/apps/)
2. Click **Create App**
3. Select **Business** as the app type
4. Fill in app details:
   - App name: "Your Business Name - WhatsApp"
   - Contact email: your email
   - Business Account: Select your business account
5. Click **Create App**

### Step 2: Add WhatsApp Product

1. In your app dashboard, scroll down to **Add Products**
2. Find **WhatsApp** and click **Set Up**
3. You'll be redirected to the WhatsApp API Setup page

### Step 3: Get Your Credentials

From the **API Setup** page, note down:

1. **WhatsApp Business Account ID (WABA ID)**
   - Found at the top of the API Setup page
   - Example: `123456789012345`

2. **Phone Number ID**
   - Found in the "From" dropdown when sending test messages
   - Click the phone number to see its ID
   - Example: `109876543210987`

3. **Access Token**
   - Click **Generate Token** to get a temporary token
   - For production, create a **System User** and generate a permanent token

### Step 4: Configure Webhooks

1. In your Meta App, go to **WhatsApp > Configuration**
2. Set up the webhook:
   - **Callback URL**: `https://your-domain.com/api/webhooks/whatsapp`
   - **Verify Token**: Copy from your Callyy dashboard (shown after connecting)
3. Subscribe to webhook fields:
   - ✅ `messages` - Incoming messages
   - ✅ `message_status` - Delivery/read receipts
   - ✅ `calls` - Call events (for calling feature)

### Step 5: Connect in Callyy Dashboard

1. Go to **Messenger > WhatsApp** in your Callyy dashboard
2. Click **Connect WhatsApp Business**
3. Enter your credentials:
   - WhatsApp Business Account ID
   - Phone Number ID
   - Display Phone Number (formatted, e.g., "+1 555-123-4567")
   - Business Display Name
   - Access Token
4. Click **Connect**

### Step 6: Verify Connection

1. After connecting, click the **Refresh** icon to verify
2. Check that status shows **Connected**
3. Note your Quality Rating and Messaging Limit

## Enabling Features

### AI Chatbot

1. Go to WhatsApp settings > **Chatbot** tab
2. Toggle **Enable AI Chatbot**
3. Select an AI Assistant from the dropdown
4. Save changes

The selected assistant will automatically respond to incoming WhatsApp messages.

### Voice Calling

> **Note**: Business-initiated calling is not available in USA, Canada, Turkey, Egypt, Vietnam, and Nigeria.

1. Go to WhatsApp settings > **Calling** tab
2. Toggle **Enable Calling**
3. Configure:
   - **Inbound Calls**: Allow customers to call you
   - **Outbound Calls**: Allow initiating calls to customers
   - **Callback Requests**: Let customers request a callback

### Business Hours (Optional)

Configure business hours to only accept calls during work hours:

```javascript
{
  "timezone": "America/New_York",
  "schedule": [
    { "day": "monday", "enabled": true, "startTime": "09:00", "endTime": "17:00" },
    { "day": "tuesday", "enabled": true, "startTime": "09:00", "endTime": "17:00" },
    // ... other days
  ]
}
```

## Database Schema

The integration uses the following tables:

- `whatsapp_configs` - WhatsApp account configurations
- `whatsapp_messages` - Message history
- `whatsapp_calls` - Call history
- `whatsapp_contacts` - WhatsApp contacts
- `whatsapp_templates` - Message templates

Run the migration:
```bash
# In Supabase SQL Editor
\i backend/supabase/migrations/006_whatsapp_integration.sql
```

## API Reference

### WhatsApp Cloud API

- **Base URL**: `https://graph.facebook.com/v21.0`
- **Send Message**: `POST /{phone-number-id}/messages`
- **Initiate Call**: `POST /{phone-number-id}/calls`
- **Update Settings**: `POST /{phone-number-id}/settings`

### Webhook Events

#### Incoming Message
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "field": "messages",
      "value": {
        "messages": [{
          "from": "1234567890",
          "type": "text",
          "text": { "body": "Hello!" }
        }]
      }
    }]
  }]
}
```

#### Incoming Call
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "field": "calls",
      "value": {
        "calls": [{
          "call_id": "call_123",
          "from": "1234567890",
          "status": "ringing"
        }]
      }
    }]
  }]
}
```

## Troubleshooting

### "Not enough permissions" Error
- Ensure your Access Token has `whatsapp_business_messaging` permission
- Regenerate the token if needed

### Webhook Verification Failing
- Check that your server is accessible from the internet
- Verify the Callback URL is correct (HTTPS required)
- Ensure Verify Token matches exactly

### Calling Not Working
- Verify your messaging limit is ≥2,000/day
- Check that calling is enabled in phone number settings
- Business-initiated calls require user permission first

### Quality Rating Issues
- Review [WhatsApp Business Messaging Policy](https://business.whatsapp.com/policy)
- Ensure users have opted in to receive messages
- Avoid sending too many messages too quickly

## Useful Links

- [WhatsApp Cloud API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [WhatsApp Calling API](https://developers.facebook.com/docs/whatsapp/cloud-api/calling)
- [Message Templates](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates)
- [Webhooks Reference](https://developers.facebook.com/docs/whatsapp/webhooks/reference)
- [WhatsApp Business Policy](https://business.whatsapp.com/policy)

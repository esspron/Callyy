# Meta App Setup for Embedded Signup

This guide details how to set up a Meta App specifically for **WhatsApp Embedded Signup** (allowing users to connect their own WhatsApp accounts to your platform).

## Phase 1: Create the Meta App

1.  **Log in to Meta for Developers**
    *   Go to [developers.facebook.com](https://developers.facebook.com/).
    *   Log in with your Facebook account.
    *   Click **My Apps** (top right).

2.  **Create a New App**
    *   Click the green **Create App** button.
    *   **Select an app type**: Choose **Business** (or "Other" > "Business" depending on the current UI).
    *   Click **Next**.

3.  **Fill in App Details**
    *   **Display Name**: Enter your app name (e.g., "Callyy Dashboard").
    *   **App Contact Email**: Enter your email.
    *   **Business Account**: Select your Meta Business Account. (If you don't have one, you'll need to create it).
    *   Click **Create App**.

## Phase 2: Add Products

You need two specific products for Embedded Signup:

1.  **Facebook Login for Business** (NOT the regular Facebook Login)
    *   On the "Add Products to Your App" page, find **Facebook Login for Business**.
    *   Click **Set Up**.
    *   *Note: If you only see "Facebook Login", use that, but look for "Business" settings later.*

2.  **WhatsApp**
    *   Go back to the Dashboard or "Add Products" menu.
    *   Find **WhatsApp**.
    *   Click **Set Up**.

## Phase 3: Configure Facebook Login for Business

1.  **Settings**
    *   In the left sidebar, expand **Facebook Login for Business** > **Settings**.
    *   **Valid OAuth Redirect URIs**: You must add the URL where your dashboard is hosted.
        *   For local development: `http://localhost:5173/` (or your specific port).
        *   For production: `https://your-domain.com/` and `https://your-domain.com/auth/callback` (or wherever you handle the return).
    *   **Login Configuration**:
        *   You might need to create a "Configuration".
        *   Name: "WhatsApp Onboarding".
        *   **Permissions**: Ensure you request:
            *   `whatsapp_business_management`
            *   `whatsapp_business_messaging`

## Phase 4: Get Your Credentials

1.  **App ID and Secret**
    *   In the left sidebar, go to **App Settings** > **Basic**.
    *   **App ID**: Copy this string.
    *   **App Secret**: Click "Show", enter your password, and copy the secret.

2.  **Config ID (for the Login Button)**
    *   If you created a Login Configuration in Phase 3, copy the **Config ID**.
    *   If not, you will generate this in your frontend code using the Facebook SDK, but having a pre-configured one is often easier.

## Phase 5: Tech Provider / Solution Partner (Important)

For **Embedded Signup** to work fully (where you onboard *other* businesses), your Meta App usually needs to be associated with a Business Manager that is a **Tech Provider** or **Solution Partner**.

*   **Development Mode**: You can test Embedded Signup with your *own* Facebook account and businesses associated with your developer account without being a Tech Provider.
*   **Live Mode**: To onboard external users, you typically need to complete **Business Verification** and apply for **Tech Provider** status.

## Summary of Credentials Needed for Code

Save these in your `.env` or secrets manager:

*   `VITE_FACEBOOK_APP_ID`: (From Phase 4.1)
*   `FACEBOOK_APP_SECRET`: (From Phase 4.1 - Keep this backend only!)
*   `VITE_FACEBOOK_CONFIG_ID`: (From Phase 3, optional but recommended)

## Next Steps in Code

1.  **Frontend**: Initialize the Facebook SDK (`FB.init`) with your `appId`.
2.  **Frontend**: Trigger the login flow:
    ```javascript
    FB.login(function(response) {
      if (response.authResponse) {
        const code = response.authResponse.code;
        // Send this code to your backend
      }
    }, {
      config_id: '<YOUR_CONFIG_ID>', // Or scope: 'whatsapp_business_management,whatsapp_business_messaging'
      response_type: 'code',     // Important for Embedded Signup
      override_default_response_type: true,
      extras: {
        feature: 'whatsapp_embedded_signup',
        setup: {
          ... // Pre-fill data
        }
      }
    });
    ```
3.  **Backend**: Exchange the `code` for a System User Access Token.

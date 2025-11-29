# Voicory Admin Panel

> ⚠️ **LOCAL ACCESS ONLY** - This admin panel is meant to be run locally and should **NOT** be deployed to Vercel or any public hosting.

## Overview

The Voicory Admin Panel is a separate React application for managing:
- **Coupons** - Create, manage, bulk generate promotional codes
- **Users** - View registered users and their billing information

## Security

Access to the admin panel requires a passkey. The default passkey is:
```
voicory2024admin
```

**⚠️ Important:** Change this passkey in `src/App.tsx` before use:
```typescript
const ADMIN_PASSKEY = 'your-secure-passkey-here';
```

## Setup

### 1. Install Dependencies

```bash
cd admin
npm install
```

### 2. Configure Environment

Copy the example environment file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_BACKEND_URL=https://callyy-production.up.railway.app
```

You can copy these values from the main frontend's `.env.local` file.

### 3. Run Locally

```bash
npm run dev
```

The admin panel will start on **http://localhost:5174** (different from the main frontend on 5173).

## Features

### Coupon Manager
- Create single coupons with custom codes
- Bulk generate multiple promo codes
- Toggle coupon active/inactive status
- View usage statistics
- Filter and search coupons
- Export generated codes

### User Manager
- View all registered users
- See user balances and spending
- Track assistant counts per user
- Sort and filter users

## Tech Stack

- React 19 + TypeScript
- Tailwind CSS v4
- Vite
- Phosphor Icons
- Supabase (for database access)

## File Structure

```
admin/
├── src/
│   ├── App.tsx              # Main app with passkey auth
│   ├── app.css              # Tailwind theme
│   ├── index.tsx            # Entry point
│   ├── components/
│   │   └── PasskeyGate.tsx  # Passkey authentication
│   ├── pages/
│   │   ├── AdminDashboard.tsx  # Layout with sidebar
│   │   ├── CouponManager.tsx   # Coupon management
│   │   └── UserManager.tsx     # User management
│   └── services/
│       └── supabase.ts      # Supabase client
├── .env.example             # Environment template
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Important Notes

1. **Never deploy this to production** - It has admin-level access
2. **Change the passkey** before using in production
3. **Keep environment files secure** - They contain sensitive keys
4. **Session-based auth** - Closing the browser logs you out

## Troubleshooting

### "Failed to connect to server"
- Make sure the backend is running on Railway
- Check that `VITE_BACKEND_URL` is correct in `.env.local`

### "Cannot find module"
- Run `npm install` to install dependencies

### Coupons not loading
- Verify Supabase credentials are correct
- Check that the coupons table exists and has proper RLS policies

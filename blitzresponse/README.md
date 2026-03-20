# BlitzResponse.io

AI-Powered 24/7 Emergency Dispatch & Instant Quoting for Restoration Companies.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in your API keys
cp .env.example .env.local

# 3. Push database schema to Neon
npx prisma db push

# 4. Generate Prisma client
npx prisma generate

# 5. Seed demo data
npm run db:seed

# 6. Start development server
npm run dev
```

Open http://localhost:3000

## Required Accounts (create these first)

| Service | URL | Free Tier? |
|---|---|---|
| Neon (PostgreSQL) | https://console.neon.tech | Yes |
| Clerk (Auth) | https://dashboard.clerk.com | Yes |
| Retell AI (Voice) | https://www.retellai.com | Trial |
| Twilio (SMS) | https://console.twilio.com | Trial + $15 credit |
| OpenAI (LLM + Vision) | https://platform.openai.com | Pay-as-you-go |
| Groq (Fast LLM) | https://console.groq.com | Free |
| Stripe (Billing) | https://dashboard.stripe.com | Test mode free |
| Supabase (Storage) | https://supabase.com | Free |
| Resend (Email) | https://resend.com | Free |

## Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add CLERK_SECRET_KEY
# ... (add all vars from .env.example)

# Deploy to production
vercel --prod
```

## Project Structure

- `prisma/` — Database schema and seed script
- `src/app/` — Next.js pages (App Router)
- `src/server/` — Backend: tRPC routers, services, background jobs
- `src/components/` — React components
- `src/types/` — TypeScript type definitions
- `public/` — Static assets (logo)

## Tech Stack

Next.js 14 · TypeScript · Tailwind CSS · shadcn/ui · tRPC · Prisma · PostgreSQL (Neon) · Clerk Auth · Retell AI · Twilio · OpenAI GPT-4o · Groq · Stripe · Supabase Storage · Resend

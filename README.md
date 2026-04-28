# PromptSphere — AI Prompt Marketplace

A professional tool where you can generate, organize, and share optimized AI prompts. Built with Next.js 14, Firebase, and Tailwind CSS.

## Features

- 🔐 **Google Sign-In** via Firebase Auth
- 📝 **Prompt CRUD** — create, view, and delete your prompts with tags
- 👤 **User Dashboard** — manage prompts and view your profile
- ⚙️ **Admin Panel** — user management, roles, activity logs, and settings (restricted to admin email)
- 🎨 **Glassmorphism UI** with neon glow accents

## Getting Started

1. Copy `.env.local.example` to `.env.local` and fill in your Firebase project credentials.

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Firebase Setup

Create a Firebase project and enable:
- **Authentication** → Google Sign-In provider
- **Firestore Database**

Add your config values to `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

## Tech Stack

- [Next.js 14](https://nextjs.org) (App Router)
- [Firebase](https://firebase.google.com) (Auth + Firestore)
- [Tailwind CSS](https://tailwindcss.com)
- TypeScript


## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

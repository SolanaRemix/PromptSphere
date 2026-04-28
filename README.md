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


## Deployment

Deploy on [Vercel](https://vercel.com) or any platform that supports Next.js. Remember to add your Firebase environment variables to the platform's environment settings.

import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://promptsphere.app';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'PromptSphere — AI Prompt Marketplace',
    template: '%s | PromptSphere',
  },
  description:
    'Discover, create, buy, and sell powerful AI prompts. Filter by category, earn affiliate commissions, and supercharge your workflow.',
  keywords: [
    'AI prompts',
    'prompt marketplace',
    'ChatGPT prompts',
    'buy AI prompts',
    'sell prompts',
    'prompt engineering',
  ],
  authors: [{ name: 'PromptSphere' }],
  creator: 'PromptSphere',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: APP_URL,
    siteName: 'PromptSphere',
    title: 'PromptSphere — AI Prompt Marketplace',
    description:
      'Discover, create, buy, and sell powerful AI prompts. Trending feed, affiliate programme, and multi-provider payments.',
    images: [
      {
        url: `${APP_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'PromptSphere — AI Prompt Marketplace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PromptSphere — AI Prompt Marketplace',
    description: 'Discover, create, buy, and sell powerful AI prompts.',
    images: [`${APP_URL}/og-image.png`],
    creator: '@promptsphere',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: APP_URL,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-dark-900 text-white font-sans">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

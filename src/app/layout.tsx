import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

export const dynamic = 'force-dynamic'; // Prevents SSR pre-rendering failures when Firebase env vars are absent at build time
export const metadata: Metadata = {
  title: 'PromptSphere — AI Prompt Marketplace',
  description: 'Discover, create, and share powerful AI prompts',
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

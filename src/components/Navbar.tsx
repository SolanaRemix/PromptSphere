'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { signOut } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-brand-purple/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-gradient">PromptSphere</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link href="/marketplace" className="text-gray-300 hover:text-brand-purple transition-colors">
              Marketplace
            </Link>
            <Link href="/#features" className="text-gray-300 hover:text-brand-purple transition-colors">
              Features
            </Link>
            <Link href="/#pricing" className="text-gray-300 hover:text-brand-purple transition-colors">
              Pricing
            </Link>
            <Link href="/docs" className="text-gray-300 hover:text-brand-purple transition-colors">
              Docs
            </Link>
            {user && (
              <Link href="/dashboard" className="text-gray-300 hover:text-brand-purple transition-colors">
                Dashboard
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin" className="text-gray-300 hover:text-brand-cyan transition-colors">
                Admin
              </Link>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                {user.photoURL && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-brand-purple/50" />
                )}
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-sm text-gray-300 border border-dark-600 rounded-lg hover:border-brand-purple/50 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm btn-gradient rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-dark-800 border-t border-dark-700 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold text-gradient mb-4">PromptSphere</h3>
            <p className="text-gray-400 text-sm">
              The ultimate AI prompt marketplace for creators and developers.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/#features" className="hover:text-brand-purple transition-colors">Features</Link></li>
              <li><Link href="/#pricing" className="hover:text-brand-purple transition-colors">Pricing</Link></li>
              <li><Link href="/dashboard" className="hover:text-brand-purple transition-colors">Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="#" className="hover:text-brand-purple transition-colors">About</Link></li>
              <li><Link href="#" className="hover:text-brand-purple transition-colors">Blog</Link></li>
              <li><Link href="#" className="hover:text-brand-purple transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="#" className="hover:text-brand-purple transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-brand-purple transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-dark-700 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} PromptSphere. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

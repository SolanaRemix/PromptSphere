'use client';

import { useState } from 'react';
import type { MarketplaceListing, PaymentMethod } from '@/types';

interface PaymentModalProps {
  listing: MarketplaceListing;
  onClose: () => void;
  onSuccess: (method: PaymentMethod) => void;
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: string; color: string }[] = [
  { id: 'stripe', label: 'Credit / Debit Card', icon: '💳', color: 'text-blue-400' },
  { id: 'paypal', label: 'PayPal', icon: '🅿️', color: 'text-blue-500' },
  { id: 'google_pay', label: 'Google Pay', icon: '🔵', color: 'text-green-400' },
  { id: 'cashapp', label: 'Cash App', icon: '💚', color: 'text-green-500' },
  { id: 'gcash', label: 'GCash', icon: '🔷', color: 'text-blue-400' },
  { id: 'credit_card', label: 'Other Card', icon: '🏦', color: 'text-gray-300' },
];

export default function PaymentModal({ listing, onClose, onSuccess }: PaymentModalProps) {
  const [selected, setSelected] = useState<PaymentMethod | null>(null);
  const [step, setStep] = useState<'select' | 'confirm' | 'processing' | 'done'>('select');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  // Convert price from cents (Firestore storage) to dollars for display.
  const price = listing.price / 100;

  const handleProceed = () => {
    if (!selected) return;
    setStep('confirm');
  };

  const handlePay = async () => {
    setStep('processing');
    // Simulate payment processing
    await new Promise((r) => setTimeout(r, 1800));
    setStep('done');
    setTimeout(() => {
      onSuccess(selected!);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass-card rounded-2xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors text-xl leading-none"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Complete Purchase</h2>
          <p className="text-gray-400 text-sm mt-1">{listing.title}</p>
        </div>

        {/* Amount */}
        <div className="glass-card rounded-xl p-4 mb-6 flex items-center justify-between">
          <span className="text-gray-300">Total</span>
          <span className="text-2xl font-bold text-brand-purple">
            {price === 0 ? 'Free' : `$${price.toFixed(2)}`}
          </span>
        </div>

        {/* Step: Select payment method */}
        {step === 'select' && (
          <>
            <p className="text-gray-400 text-sm mb-3">Choose a payment method:</p>
            <div className="space-y-2 mb-6">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelected(m.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    selected === m.id
                      ? 'border-brand-purple bg-brand-purple/10'
                      : 'border-dark-600 hover:border-brand-purple/50 bg-dark-800'
                  }`}
                >
                  <span className="text-xl">{m.icon}</span>
                  <span className={`font-medium ${m.color}`}>{m.label}</span>
                  {selected === m.id && (
                    <span className="ml-auto text-brand-purple">✓</span>
                  )}
                </button>
              ))}
            </div>
            <button
              disabled={!selected}
              onClick={handleProceed}
              className="w-full btn-gradient py-3 rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              Continue
            </button>
          </>
        )}

        {/* Step: Confirm / card details */}
        {step === 'confirm' && (
          <>
            {(selected === 'stripe' || selected === 'credit_card') ? (
              <div className="space-y-4 mb-6">
                {/* Demo notice — in production replace with Stripe Elements or
                    another provider-hosted card UI so raw card data never
                    enters application state. */}
                <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                  <span className="text-yellow-400 text-sm">⚠️</span>
                  <p className="text-yellow-300 text-xs">
                    <strong>Demo mode:</strong> no real card data is processed.
                    Use test number <span className="font-mono">4242 4242 4242 4242</span>.
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Card Number</label>
                  <input
                    type="text"
                    maxLength={19}
                    placeholder="4242 4242 4242 4242"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-purple"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Expiry</label>
                    <input
                      type="text"
                      maxLength={5}
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-purple"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">CVV</label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="123"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-purple"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card rounded-xl p-4 mb-6 text-center">
                <p className="text-gray-300 text-sm">
                  You will be redirected to{' '}
                  <span className="text-brand-purple font-semibold">
                    {PAYMENT_METHODS.find((m) => m.id === selected)?.label}
                  </span>{' '}
                  to complete your payment securely.
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setStep('select')}
                className="flex-1 py-3 rounded-xl border border-dark-600 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handlePay}
                className="flex-1 btn-gradient py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                Pay {price === 0 ? 'Free' : `$${price.toFixed(2)}`}
              </button>
            </div>
          </>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div className="py-8 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-300">Processing payment…</p>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="py-8 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center text-3xl">
              ✅
            </div>
            <p className="text-white font-semibold text-lg">Payment Successful!</p>
            <p className="text-gray-400 text-sm text-center">
              {listing.title} has been added to your library.
            </p>
          </div>
        )}

        <p className="text-center text-xs text-gray-600 mt-4">
          🔒 Payments are secured and encrypted
        </p>
      </div>
    </div>
  );
}

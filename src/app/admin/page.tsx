'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAllUsers,
  getRoles,
  getActivityLogs,
  getAllPayments,
  getAllAffiliates,
  refundPayment,
} from '@/lib/firestore';
import UserTable from '@/components/UserTable';
import { User, Role, ActivityLog, Payment, Affiliate } from '@/types';
import Link from 'next/link';
import { signOut, ADMIN_EMAIL } from '@/lib/auth';
import { formatDate, formatDateTime, DEFAULT_COMMISSION_RATE } from '@/lib/utils';

export default function AdminPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [activeTab, setActiveTab] = useState<
    'users' | 'roles' | 'settings' | 'logs' | 'payments' | 'affiliates' | 'spam' | 'apikeys'
  >('users');
  const [dataLoading, setDataLoading] = useState(true);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [platformFee, setPlatformFee] = useState(10);
  // Initialise from DEFAULT_COMMISSION_RATE to stay in sync with what the
  // affiliate creation flow actually uses as the default.
  const [defaultCommission, setDefaultCommission] = useState(
    Math.round(DEFAULT_COMMISSION_RATE * 100)
  );

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (!isAdmin) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const loadData = async () => {
    setDataLoading(true);
    try {
      const [usersData, rolesData, logsData, paymentsData, affiliatesData] = await Promise.all([
        getAllUsers(),
        getRoles(),
        getActivityLogs(),
        getAllPayments(),
        getAllAffiliates(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      setLogs(logsData);
      setPayments(paymentsData);
      setAffiliates(affiliatesData);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleRefund = async (paymentId: string) => {
    if (!user) return;
    if (!confirm('Mark this payment as refunded?')) return;
    setRefundingId(paymentId);
    try {
      await refundPayment(paymentId, user.uid);
      setPayments((prev) =>
        prev.map((p) => (p.id === paymentId ? { ...p, status: 'refunded' } : p))
      );
    } catch (err) {
      console.error('Refund error:', err);
    } finally {
      setRefundingId(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  const totalRevenue = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  const tabs = [
    { id: 'users', label: '👥 Users', count: users.length },
    { id: 'payments', label: '💳 Payments', count: payments.length },
    { id: 'affiliates', label: '🤝 Affiliates', count: affiliates.length },
    { id: 'roles', label: '🔑 Roles', count: roles.length },
    { id: 'logs', label: '📋 Activity Logs', count: logs.length },
    { id: 'spam', label: '🛡️ Spam Control' },
    { id: 'apikeys', label: '🔐 API Keys' },
    { id: 'settings', label: '⚙️ Settings' },
  ] as const;

  return (
    <div className="min-h-screen bg-dark-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-dark-800 border-r border-dark-700 flex flex-col fixed h-full">
        <div className="p-6 border-b border-dark-700">
          <Link href="/" className="text-xl font-bold text-gradient">PromptSphere</Link>
          <div className="mt-2 px-2 py-1 bg-brand-purple/20 text-brand-purple text-xs rounded-full inline-block">
            Admin Panel
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center justify-between text-sm ${
                activeTab === tab.id
                  ? 'bg-brand-purple/20 text-brand-purple'
                  : 'text-gray-400 hover:text-white hover:bg-dark-700'
              }`}
            >
              <span>{tab.label}</span>
              {'count' in tab && tab.count !== undefined && (
                <span className="text-xs bg-dark-600 px-2 py-0.5 rounded-full">{tab.count}</span>
              )}
            </button>
          ))}
          <Link
            href="/dashboard"
            className="w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 text-gray-400 hover:text-white hover:bg-dark-700 text-sm"
          >
            ← Dashboard
          </Link>
        </nav>
        <div className="p-4 border-t border-dark-700">
          <div className="flex items-center gap-3 mb-4">
            {user.photoURL && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full" />
            )}
            <div className="overflow-hidden">
              <p className="text-sm text-white truncate">{user.displayName}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-dark-700 transition-colors text-left text-sm"
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 p-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Users', value: users.length, icon: '👥', color: 'text-brand-purple' },
            { label: 'Total Revenue', value: `$${(totalRevenue / 100).toFixed(2)}`, icon: '💰', color: 'text-green-400' },
            { label: 'Affiliates', value: affiliates.length, icon: '🤝', color: 'text-brand-cyan' },
            { label: 'Transactions', value: payments.length, icon: '💳', color: 'text-brand-pink' },
          ].map((stat) => (
            <div key={stat.label} className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg">{stat.icon}</span>
                <span className={`text-xl font-bold ${stat.color}`}>{stat.value}</span>
              </div>
              <p className="text-gray-400 text-xs">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">
            {activeTab === 'users' && 'User Management'}
            {activeTab === 'roles' && 'Roles Management'}
            {activeTab === 'logs' && 'Activity Logs'}
            {activeTab === 'settings' && 'System Settings'}
            {activeTab === 'payments' && 'Payments'}
            {activeTab === 'affiliates' && 'Affiliates'}
            {activeTab === 'spam' && 'Spam Control'}
            {activeTab === 'apikeys' && 'API Keys'}
          </h1>
          <button
            onClick={loadData}
            className="text-sm text-brand-purple hover:text-brand-pink transition-colors"
          >
            ↻ Refresh
          </button>
        </div>

        {dataLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'users' && (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-dark-700">
                  <h2 className="text-lg font-semibold text-white">All Users ({users.length})</h2>
                </div>
                <UserTable users={users} />
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-dark-700 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">
                    All Payments ({payments.length})
                  </h2>
                  <span className="text-green-400 font-semibold">
                    Total: ${(totalRevenue / 100).toFixed(2)}
                  </span>
                </div>
                {payments.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-5xl mb-4">💳</p>
                    <p className="text-gray-400">No payments yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-dark-700">
                        <tr>
                          {['User', 'Amount', 'Method', 'Status', 'Date', 'Action'].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-gray-400 font-medium">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-700">
                        {payments.map((p) => (
                          <tr key={p.id} className="hover:bg-dark-700/50">
                            <td className="px-4 py-3 text-gray-300 font-mono text-xs truncate max-w-[120px]">
                              {p.userId.slice(0, 10)}…
                            </td>
                            <td className="px-4 py-3 text-green-400 font-semibold">
                              ${(p.amount / 100).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-gray-300 capitalize">{p.method}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs ${
                                  p.status === 'completed'
                                    ? 'bg-green-500/20 text-green-400'
                                    : p.status === 'failed'
                                    ? 'bg-red-500/20 text-red-400'
                                    : p.status === 'refunded'
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : 'bg-gray-500/20 text-gray-400'
                                }`}
                              >
                                {p.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">
                              {formatDate(p.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              {(p.status === 'completed' || p.status === 'pending') && (
                                <button
                                  onClick={() => handleRefund(p.id)}
                                  disabled={refundingId === p.id}
                                  className="text-xs px-2 py-1 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
                                >
                                  {refundingId === p.id ? '…' : 'Refund'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'affiliates' && (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-dark-700">
                  <h2 className="text-lg font-semibold text-white">
                    All Affiliates ({affiliates.length})
                  </h2>
                </div>
                {affiliates.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-5xl mb-4">🤝</p>
                    <p className="text-gray-400">No affiliates yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-dark-700">
                        <tr>
                          {['Name', 'Email', 'Commission %', 'Referrals', 'Total Earned', 'Pending', 'Joined'].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-gray-400 font-medium">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-700">
                        {affiliates.map((a) => (
                          <tr key={a.id} className="hover:bg-dark-700/50">
                            <td className="px-4 py-3 text-white">{a.displayName}</td>
                            <td className="px-4 py-3 text-gray-400 text-xs">{a.email}</td>
                            <td className="px-4 py-3 text-brand-cyan">
                              {(a.commissionRate * 100).toFixed(0)}%
                            </td>
                            <td className="px-4 py-3 text-gray-300">{a.referrals.length}</td>
                            <td className="px-4 py-3 text-green-400">
                              ${(a.totalEarnings / 100).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-yellow-400">
                              ${(a.pendingPayout / 100).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">
                              {formatDate(a.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'roles' && (
              <div className="space-y-4">
                {roles.length === 0 ? (
                  <div className="glass-card rounded-2xl p-8 text-center">
                    <p className="text-5xl mb-4">🔑</p>
                    <p className="text-gray-400">No roles configured yet.</p>
                    <p className="text-gray-500 text-sm mt-2">Roles will appear here once configured in Firestore.</p>
                  </div>
                ) : (
                  roles.map((role) => (
                    <div key={role.id} className="glass-card rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white capitalize">{role.name}</h3>
                        <span className="text-xs text-gray-400">ID: {role.id}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {role.permissions.map((perm, i) => (
                          <span key={i} className="px-2 py-1 text-xs rounded-full bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30">
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-dark-700">
                  <h2 className="text-lg font-semibold text-white">Activity Logs ({logs.length})</h2>
                </div>
                <div className="divide-y divide-dark-700">
                  {logs.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-5xl mb-4">📋</p>
                      <p className="text-gray-400">No activity logs yet.</p>
                    </div>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="p-4 hover:bg-dark-700/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-white font-medium">{log.action}</span>
                            <span className="text-gray-500 text-sm ml-3">by {log.userId}</span>
                          </div>
                          <span className="text-gray-500 text-sm">
                            {formatDateTime(log.timestamp)}
                          </span>
                        </div>
                        {log.metadata && (
                          <pre className="mt-2 text-xs text-gray-500 bg-dark-700 rounded p-2 overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'spam' && (
              <div className="space-y-6">
                <div className="glass-card rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">🛡️ Spam Control</h2>
                  <p className="text-gray-400 text-sm mb-4">
                    Review flagged listings and users. Banned users are prevented from publishing new prompts.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-3 border-b border-dark-700">
                      <div>
                        <p className="text-white text-sm">Auto-flag duplicate listings</p>
                        <p className="text-gray-500 text-xs">Flag listings with identical content</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-dark-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-purple" />
                      </label>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-dark-700">
                      <div>
                        <p className="text-white text-sm">Rate-limit new accounts</p>
                        <p className="text-gray-500 text-xs">New users can publish max 3 prompts/day</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-dark-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-purple" />
                      </label>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-white text-sm">Email alerts on spam reports</p>
                        <p className="text-gray-500 text-xs">Get notified when a listing is reported</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-dark-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-purple" />
                      </label>
                    </div>
                  </div>
                </div>
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-base font-semibold text-white mb-3">Reported Listings</h3>
                  <div className="text-center py-8">
                    <p className="text-4xl mb-2">✅</p>
                    <p className="text-gray-400 text-sm">No reported listings at this time.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'apikeys' && (
              <div className="space-y-6">
                <div className="glass-card rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-2">🔐 API Keys & Configuration</h2>
                  <p className="text-gray-500 text-xs mb-4">
                    ⚠️ Secret keys must be stored in server environment variables — never commit them to source control.
                    Set these values in your hosting provider&apos;s environment settings.
                  </p>
                  <div className="space-y-4">
                    {[
                      { label: 'Stripe Publishable Key', env: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', hint: 'pk_live_…' },
                      { label: 'Stripe Secret Key', env: 'STRIPE_SECRET_KEY', hint: 'sk_live_… (server-only)' },
                      { label: 'PayPal Client ID', env: 'NEXT_PUBLIC_PAYPAL_CLIENT_ID', hint: 'AXxx…' },
                      { label: 'Firebase Project ID', env: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', hint: 'your-project-id' },
                      { label: 'App Base URL', env: 'NEXT_PUBLIC_APP_URL', hint: 'https://promptsphere.app' },
                    ].map((key) => (
                      <div key={key.env} className="flex flex-col gap-1">
                        <label className="text-sm text-gray-300">{key.label}</label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-dark-700 border border-dark-600 rounded-xl px-3 py-2 text-xs text-gray-500 font-mono">
                            {key.env}={key.hint}
                          </code>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* Fee Configuration */}
                <div className="glass-card rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-1">💰 Fee Configuration</h2>
                  <p className="text-gray-500 text-xs mb-4">
                    Configure platform fees and default affiliate commission rates.
                    Changes are previewed here for this session; to persist them, store the values in
                    your environment variables or a Firestore config document.
                  </p>
                  {platformFee + defaultCommission > 100 && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
                      ⚠️ Platform fee + affiliate commission exceeds 100%. The seller would receive a negative amount — please reduce one or both values.
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">
                        Platform Fee (%)
                        <span className="text-gray-500 text-xs ml-2">— charged on each sale</span>
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={platformFee}
                          onChange={(e) => setPlatformFee(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                          className="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-purple text-sm"
                        />
                        <span className="text-gray-400 text-sm">%</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-600">
                        Platform keeps {platformFee}% of each transaction.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">
                        Default Affiliate Commission (%)
                        <span className="text-gray-500 text-xs ml-2">— paid to referrer</span>
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={defaultCommission}
                          onChange={(e) => setDefaultCommission(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                          className="w-full bg-dark-700 border border-dark-600 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand-purple text-sm"
                        />
                        <span className="text-gray-400 text-sm">%</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-600">
                        New affiliates start at {defaultCommission}% commission.
                      </p>
                    </div>
                  </div>
                  {platformFee + defaultCommission <= 100 && (
                    <div className="mt-4 p-3 bg-brand-purple/10 border border-brand-purple/20 rounded-xl text-xs text-gray-400">
                      💡 With current rates, on a $10 sale: platform earns ${(10 * platformFee / 100).toFixed(2)}, affiliate earns ${(10 * defaultCommission / 100).toFixed(2)}, seller receives ${(10 * (100 - platformFee - defaultCommission) / 100).toFixed(2)}.
                    </div>
                  )}
                </div>

                <div className="glass-card rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Application Settings</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-dark-700">
                      <div>
                        <p className="text-white">Maintenance Mode</p>
                        <p className="text-gray-400 text-sm">Temporarily disable access for all non-admin users</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-dark-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-purple" />
                      </label>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-dark-700">
                      <div>
                        <p className="text-white">New User Registration</p>
                        <p className="text-gray-400 text-sm">Allow new users to create accounts</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-dark-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-purple" />
                      </label>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-white">Email Notifications</p>
                        <p className="text-gray-400 text-sm">Send email notifications for new activity</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-dark-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-purple" />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">System Info</h2>
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-400">Total Users</dt>
                      <dd className="text-white font-medium">{users.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-400">Admin Email</dt>
                      <dd className="text-brand-purple font-medium">{ADMIN_EMAIL}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-400">Total Revenue</dt>
                      <dd className="text-green-400 font-medium">${(totalRevenue / 100).toFixed(2)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-400">App Version</dt>
                      <dd className="text-white font-medium">2.0.0</dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}


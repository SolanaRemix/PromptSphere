'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getAllUsers, getRoles, getActivityLogs } from '@/lib/firestore';
import UserTable from '@/components/UserTable';
import { User, Role, ActivityLog } from '@/types';
import Link from 'next/link';
import { signOut, ADMIN_EMAIL } from '@/lib/auth';

export default function AdminPage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'settings' | 'logs'>('users');
  const [dataLoading, setDataLoading] = useState(true);

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
      const [usersData, rolesData, logsData] = await Promise.all([
        getAllUsers(),
        getRoles(),
        getActivityLogs(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      setLogs(logsData);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setDataLoading(false);
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

  const tabs = [
    { id: 'users', label: '👥 Users', count: users.length },
    { id: 'roles', label: '🔑 Roles', count: roles.length },
    { id: 'logs', label: '📋 Activity Logs', count: logs.length },
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
        <nav className="flex-1 p-4 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center justify-between ${
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
            className="w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 text-gray-400 hover:text-white hover:bg-dark-700"
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">
              {activeTab === 'users' && 'User Management'}
              {activeTab === 'roles' && 'Roles Management'}
              {activeTab === 'logs' && 'Activity Logs'}
              {activeTab === 'settings' && 'System Settings'}
            </h1>
            <p className="text-gray-400 mt-1">Manage your PromptSphere application</p>
          </div>
        </div>

        {dataLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'users' && (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-dark-700 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">All Users ({users.length})</h2>
                  <button
                    onClick={loadData}
                    className="text-sm text-brand-purple hover:text-brand-pink transition-colors"
                  >
                    ↻ Refresh
                  </button>
                </div>
                <UserTable users={users} />
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
                            {log.timestamp instanceof Date
                              ? log.timestamp.toLocaleString()
                              : new Date(log.timestamp).toLocaleString()}
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

            {activeTab === 'settings' && (
              <div className="space-y-6">
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
                      <dt className="text-gray-400">App Version</dt>
                      <dd className="text-white font-medium">1.0.0</dd>
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

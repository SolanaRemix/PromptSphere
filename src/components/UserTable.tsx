'use client';

import { User } from '@/types';

interface UserTableProps {
  users: User[];
}

export default function UserTable({ users }: UserTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-dark-600">
            <th className="text-left py-3 px-4 text-gray-400 font-medium">User</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Email</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Role</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Tier</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium">Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.uid} className="border-b border-dark-700 hover:bg-dark-700/50 transition-colors">
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-brand-purple/30 flex items-center justify-center text-brand-purple font-bold">
                      {user.displayName?.[0] ?? '?'}
                    </div>
                  )}
                  <span className="text-white">{user.displayName}</span>
                </div>
              </td>
              <td className="py-3 px-4 text-gray-400">{user.email}</td>
              <td className="py-3 px-4">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  user.role === 'admin'
                    ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/30'
                    : 'bg-dark-600 text-gray-400'
                }`}>
                  {user.role}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  user.tier === 'pro'
                    ? 'bg-brand-pink/20 text-brand-pink border border-brand-pink/30'
                    : user.tier === 'starter'
                    ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30'
                    : 'bg-dark-600 text-gray-400'
                }`}>
                  {user.tier}
                </span>
              </td>
              <td className="py-3 px-4 text-gray-400">
                {user.createdAt instanceof Date
                  ? user.createdAt.toLocaleDateString()
                  : new Date(user.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-gray-500">No users found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

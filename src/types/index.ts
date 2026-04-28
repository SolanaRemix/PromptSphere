export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'user' | 'admin';
  tier: 'free' | 'starter' | 'pro';
  createdAt: Date;
}

export interface Prompt {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

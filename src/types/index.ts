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
  /** Detected {{parameter}} placeholders within the prompt content */
  parameters: string[];
  /** Whether this prompt is publicly visible or private */
  visibility: 'public' | 'private';
  /** Price in USD cents; 0 means free */
  price: number;
  /** Monotonically increasing edit counter */
  version: number;
  /** UIDs of users currently collaborating on this prompt */
  collaborators: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptVersion {
  id: string;
  promptId: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  parameters: string[];
  version: number;
  savedAt: Date;
}

export interface CollaboratorPresence {
  userId: string;
  displayName: string;
  photoURL: string;
  lastSeen: Date;
  /** Cursor position (character offset) within the content textarea */
  cursorPosition: number;
}

export interface AISuggestion {
  type: 'keyword' | 'phrasing' | 'topic';
  text: string;
  description: string;
  relevance: number;
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

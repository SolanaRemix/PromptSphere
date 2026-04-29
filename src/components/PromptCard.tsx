'use client';

import { Prompt } from '@/types';

interface PromptCardProps {
  prompt: Prompt;
  onDelete: (id: string) => void;
  onEdit?: (prompt: Prompt) => void;
}

export default function PromptCard({ prompt, onDelete, onEdit }: PromptCardProps) {
  return (
    <div className="glass-card rounded-xl p-6 hover:neon-border transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">{prompt.title}</h3>
        <div className="flex items-center gap-1 ml-2 shrink-0">
          {onEdit && (
            <button
              onClick={() => onEdit(prompt)}
              className="text-gray-500 hover:text-brand-purple transition-colors p-1"
              aria-label="Edit prompt"
              title="Edit prompt"
            >
              ✏️
            </button>
          )}
          <button
            onClick={() => onDelete(prompt.id)}
            className="text-gray-500 hover:text-red-400 transition-colors p-1"
            aria-label="Delete prompt"
            title="Delete prompt"
          >
            ✕
          </button>
        </div>
      </div>
      <p className="text-gray-400 text-sm mb-3 line-clamp-3">{prompt.content}</p>
      {prompt.parameters && prompt.parameters.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {prompt.parameters.map((param) => (
            <span
              key={param}
              className="px-2 py-0.5 text-xs rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-400/30"
            >
              {'{{'}{param}{'}}'}
            </span>
          ))}
        </div>
      )}
      {prompt.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {prompt.tags.map((tag, i) => (
            <span
              key={i}
              className="px-2 py-1 text-xs rounded-full bg-brand-purple/20 text-brand-purple border border-brand-purple/30"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <span>{new Date(prompt.createdAt).toLocaleDateString()}</span>
        <div className="flex items-center gap-2">
          {prompt.visibility === 'public' ? (
            <span title="Public" className="text-green-500">🌐</span>
          ) : (
            <span title="Private" className="text-gray-600">🔒</span>
          )}
          {prompt.price > 0 && (
            <span className="text-yellow-500">${(prompt.price / 100).toFixed(2)}</span>
          )}
          {(prompt.version ?? 1) > 1 && (
            <span className="text-gray-600">v{prompt.version}</span>
          )}
        </div>
      </div>
    </div>
  );
}


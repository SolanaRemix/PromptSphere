'use client';

import { Prompt } from '@/types';

interface PromptCardProps {
  prompt: Prompt;
  onDelete: (id: string) => void;
}

export default function PromptCard({ prompt, onDelete }: PromptCardProps) {
  return (
    <div className="glass-card rounded-xl p-6 hover:neon-border transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">{prompt.title}</h3>
        <button
          onClick={() => onDelete(prompt.id)}
          className="text-gray-500 hover:text-red-400 transition-colors ml-2 flex-shrink-0"
          aria-label="Delete prompt"
        >
          ✕
        </button>
      </div>
      <p className="text-gray-400 text-sm mb-4 line-clamp-3">{prompt.content}</p>
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
      <div className="mt-4 text-xs text-gray-500">
        {new Date(prompt.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}

/**
 * Client-side AI Suggestion Engine
 *
 * Provides keyword recommendations, phrasing improvements, and topic ideas
 * based on prompt content, tags, and trending patterns – entirely in the
 * browser without requiring an external AI API.
 */

import type { AISuggestion, Prompt } from '@/types';

// ---------------------------------------------------------------------------
// Trending keyword corpus
// ---------------------------------------------------------------------------

const TRENDING_KEYWORDS = [
  'step-by-step', 'explain like I\'m 5', 'concise', 'detailed', 'creative',
  'professional', 'formal', 'casual', 'persuasive', 'analytical',
  'beginner-friendly', 'expert-level', 'summarize', 'compare', 'contrast',
  'bullet points', 'numbered list', 'table format', 'JSON format', 'markdown',
  'SEO-optimized', 'engaging', 'informative', 'action-oriented', 'empathetic',
  'technical', 'non-technical', 'concise response', 'comprehensive',
  'real-world examples', 'use cases', 'pros and cons', 'best practices',
  'common mistakes', 'tips and tricks', 'how-to', 'guide', 'tutorial',
  'story format', 'dialogue', 'roleplay', 'simulate', 'critique',
  'improve', 'rewrite', 'translate', 'paraphrase', 'fact-check',
];

// ---------------------------------------------------------------------------
// Phrasing improvement patterns
// ---------------------------------------------------------------------------

interface PhrasingPattern {
  pattern: RegExp;
  suggestion: string;
  description: string;
}

const PHRASING_PATTERNS: PhrasingPattern[] = [
  {
    pattern: /\bwrite\b/i,
    suggestion: 'Write a detailed, well-structured',
    description: 'Adding "detailed" and "well-structured" produces more thorough responses.',
  },
  {
    pattern: /\bexplain\b/i,
    suggestion: 'Explain clearly in plain language',
    description: 'Specifying "plain language" makes outputs more accessible.',
  },
  {
    pattern: /\bcreate\b/i,
    suggestion: 'Create a comprehensive, original',
    description: '"Comprehensive" and "original" guide the AI toward richer output.',
  },
  {
    pattern: /\blist\b/i,
    suggestion: 'Provide a numbered list with brief explanations for each item',
    description: 'Numbered lists with explanations are easier to act on.',
  },
  {
    pattern: /\bsummariz(e|ation)\b/i,
    suggestion: 'Summarize the key points in 3–5 bullet points',
    description: 'Bounding the summary length keeps responses focused.',
  },
  {
    pattern: /\bhelp\b/i,
    suggestion: 'Help me understand by providing examples',
    description: 'Concrete examples dramatically improve understanding.',
  },
  {
    pattern: /\bgenerate\b/i,
    suggestion: 'Generate 5 unique, creative',
    description: 'Specifying a quantity focuses the output.',
  },
  {
    pattern: /\bimprove\b/i,
    suggestion: 'Improve by rewriting with clearer structure and stronger vocabulary',
    description: 'Specifying *how* to improve gives better rewrites.',
  },
];

// ---------------------------------------------------------------------------
// Topic categories derived from popular prompt use-cases
// ---------------------------------------------------------------------------

const TOPIC_CLUSTERS: Record<string, string[]> = {
  writing: [
    'blog post introduction', 'email newsletter', 'product description',
    'social media caption', 'cover letter', 'executive summary',
  ],
  coding: [
    'code review checklist', 'refactoring guide', 'unit test template',
    'API documentation', 'debugging walkthrough', 'architecture diagram',
  ],
  business: [
    'sales pitch', 'SWOT analysis', 'meeting agenda', 'project proposal',
    'competitive analysis', 'OKR template',
  ],
  education: [
    'lesson plan', 'quiz questions', 'study guide', 'flashcard set',
    'concept explanation', 'homework help',
  ],
  creative: [
    'short story outline', 'character backstory', 'poem', 'song lyrics',
    'world-building guide', 'dialogue script',
  ],
  productivity: [
    'daily stand-up template', 'weekly review', 'habit tracker',
    'goal-setting framework', 'time-blocking schedule', 'decision matrix',
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Module-level stop-word set — allocated once, never re-allocated per call. */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'me', 'us',
  'not', 'no', 'so', 'if', 'as', 'about', 'into', 'than', 'then', 'also',
]);

/** Extracts meaningful words from a string, ignoring stop-words. */
function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/** Simple string similarity (Jaccard over word sets). */
function similarity(a: string, b: string): number {
  const setA = new Set(extractKeywords(a));
  const setB = new Set(extractKeywords(b));
  const intersection = [...setA].filter((w) => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/** Detects which topic cluster(s) match the prompt content. */
function detectTopicCluster(content: string, tags: string[]): string[] {
  const text = (content + ' ' + tags.join(' ')).toLowerCase();
  return Object.keys(TOPIC_CLUSTERS).filter((cluster) =>
    TOPIC_CLUSTERS[cluster].some((topic) => {
      const topicWords = extractKeywords(topic);
      return topicWords.some((w) => text.includes(w));
    })
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates AI-powered suggestions for the given prompt content and tags.
 *
 * @param content   The current prompt content text.
 * @param tags      Tags already applied to the prompt.
 * @param existing  (Optional) list of the user's existing prompts for context.
 * @returns Array of suggestions sorted by relevance (highest first).
 */
export function generateSuggestions(
  content: string,
  tags: string[],
  existing: Prompt[] = []
): AISuggestion[] {
  const suggestions: AISuggestion[] = [];
  const contentWords = extractKeywords(content);

  // 1. Keyword suggestions ---------------------------------------------------
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));
  const usedKeywords = new Set(contentWords);

  for (const kw of TRENDING_KEYWORDS) {
    const kwWords = extractKeywords(kw);
    const alreadyUsed = kwWords.every((w) => usedKeywords.has(w));
    if (alreadyUsed) continue;

    const sim = similarity(kw, content);
    if (sim > 0 || contentWords.length === 0) {
      suggestions.push({
        type: 'keyword',
        text: kw,
        description: tagSet.has(kw.toLowerCase())
          ? `Already tagged — try adding "${kw}" in your content for extra emphasis.`
          : `Adding "${kw}" to your tags can improve discoverability.`,
        relevance: sim + (tagSet.has(kw.toLowerCase()) ? 0.1 : 0),
      });
    }
  }

  // 2. Phrasing improvement suggestions -------------------------------------
  for (const { pattern, suggestion, description } of PHRASING_PATTERNS) {
    const matchIndex = content.search(pattern);
    if (matchIndex !== -1) {
      // Score is higher when the match appears earlier in the content
      // (i.e., the pattern is central to the prompt rather than incidental).
      const normalizedPosition =
        content.length > 0 ? 1 - matchIndex / content.length : 1;
      suggestions.push({
        type: 'phrasing',
        text: suggestion,
        description,
        relevance: 0.7 + normalizedPosition * 0.2,
      });
    }
  }

  // 3. Topic idea suggestions ------------------------------------------------
  const matchedClusters = detectTopicCluster(content, tags);
  const targetClusters =
    matchedClusters.length > 0
      ? matchedClusters
      : (Object.keys(TOPIC_CLUSTERS) as string[]).slice(0, 2);

  for (const cluster of targetClusters) {
    const topics = TOPIC_CLUSTERS[cluster];
    for (const topic of topics.slice(0, 3)) {
      const sim = similarity(topic, content);
      suggestions.push({
        type: 'topic',
        text: topic,
        description: `Try a prompt around "${topic}" — a popular topic in the ${cluster} category.`,
        relevance: sim + 0.3,
      });
    }
  }

  // 4. Suggestions based on existing user prompts ---------------------------
  if (existing.length > 0) {
    const allTags = existing.flatMap((p) => p.tags);
    const tagFreq: Record<string, number> = {};
    for (const t of allTags) {
      tagFreq[t] = (tagFreq[t] ?? 0) + 1;
    }
    const topTags = Object.entries(tagFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t]) => t);

    for (const tag of topTags) {
      if (!tagSet.has(tag.toLowerCase())) {
        suggestions.push({
          type: 'keyword',
          text: tag,
          description: `You frequently use "${tag}" in your prompts — consider adding it here too.`,
          relevance: 0.6,
        });
      }
    }
  }

  // Sort by relevance descending, deduplicate by text
  const seen = new Set<string>();
  return suggestions
    .sort((a, b) => b.relevance - a.relevance)
    .filter((s) => {
      const key = `${s.type}:${s.text.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 20);
}

/**
 * Extracts `{{parameter}}` placeholder names from a prompt content string.
 */
export function extractParameters(content: string): string[] {
  const matches = content.matchAll(/\{\{([^}]+)\}\}/g);
  const params = new Set<string>();
  for (const match of matches) {
    params.add(match[1].trim());
  }
  return [...params];
}

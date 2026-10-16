const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

import type { ModerationCategory } from '../../shared/schemas.js';

type Rule = { term: string; category: ModerationCategory; severity: number };

const RULES: Rule[] = [  { term: 'nigger', category: 'slur', severity: 0.97 },
  { term: 'faggot', category: 'slur', severity: 0.97 },
  { term: 'tranny', category: 'slur', severity: 0.95 },
  { term: 'chink', category: 'slur', severity: 0.95 },
  { term: 'spic', category: 'slur', severity: 0.95 },
  { term: 'kike', category: 'slur', severity: 0.95 },
  { term: 'retard', category: 'harassment', severity: 0.7 },  { term: 'porn', category: 'sexual', severity: 0.8 },
  { term: 'pornhub', category: 'sexual', severity: 0.85 },
  { term: 'onlyfans', category: 'sexual', severity: 0.7 },
  { term: 'blowjob', category: 'sexual', severity: 0.85 },
  { term: 'creampie', category: 'sexual', severity: 0.85 },
  { term: 'cumshot', category: 'sexual', severity: 0.85 },
  { term: 'bestiality', category: 'sexual', severity: 0.99 },
  { term: 'zoophilia', category: 'sexual', severity: 0.99 },  { term: 'nudes', category: 'nudity', severity: 0.75 },
  { term: 'nsfw', category: 'nudity', severity: 0.65 },
  { term: 'topless', category: 'nudity', severity: 0.65 },  { term: 'kill yourself', category: 'self-harm', severity: 0.9 },
  { term: 'kys', category: 'self-harm', severity: 0.8 },
  { term: 'gas the', category: 'hate', severity: 0.95 },  { term: 'buy xanax', category: 'illegal', severity: 0.8 },
  { term: 'without prescription', category: 'illegal', severity: 0.6 },
];

const SUBSTITUTIONS: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
  '!': 'i',
};

function normalize(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[013457@$!]/g, (character) => SUBSTITUTIONS[character] ?? character)      .replace(/(.)\1+/g, '$1')
  );
}

const BOUNDARY = String.raw`\b`;

const MATCHERS: (Rule & { pattern: RegExp })[] = RULES.map((rule) => ({
  ...rule,  pattern: new RegExp(BOUNDARY + escapeRegex(normalize(rule.term)) + BOUNDARY, 'i'),
}));

export type WordlistHit = {
  terms: string[];
  categories: ModerationCategory[];
  
  severity: number;
};

export function scanText(text: string): WordlistHit {
  const haystack = normalize(text);
  const hits = MATCHERS.filter((matcher) => matcher.pattern.test(haystack)).sort(
    (first, second) => second.severity - first.severity
  );

  return {
    terms: hits.map((hit) => hit.term),
    categories: [...new Set(hits.map((hit) => hit.category))],
    severity: hits[0]?.severity ?? 0,
  };
}

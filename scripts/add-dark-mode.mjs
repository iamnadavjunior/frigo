import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const files = [
  'src/app/communes/page.tsx',
  'src/app/communes/[id]/page.tsx',
  'src/app/interventions/page.tsx',
  'src/app/interventions/[id]/page.tsx',
  'src/app/interventions/new/page.tsx',
  'src/app/pos/page.tsx',
  'src/app/pos/[id]/page.tsx',
  'src/app/refrigerators/[id]/page.tsx',
  'src/app/imports/page.tsx',
  'src/app/login/page.tsx',
];

// Replacement rules: [search, replace]
// These are applied in order, so more specific patterns should come first
const replacements = [
  // Fix leftover text-gray-100 headings (from old dark theme) → proper light+dark
  [/\btext-gray-100\b(?!\s+dark:)/g, 'text-gray-900 dark:text-white'],

  // Background containers
  [/\bbg-\[#F8F9FC\](?!\s+dark:)/g, 'bg-[#F8F9FC] dark:bg-[#1a2332]'],
  [/\bbg-white(?!\s+dark:)(?!\/)/g, 'bg-white dark:bg-[#1e2836]'],

  // Borders
  [/\bborder-gray-200(?!\s+dark:)/g, 'border-gray-200 dark:border-white/[0.06]'],
  [/\bborder-gray-100(?!\s+dark:)/g, 'border-gray-100 dark:border-white/[0.06]'],

  // Loading skeletons
  [/\bbg-gray-100(?!\s+dark:)/g, 'bg-gray-100 dark:bg-white/10'],

  // Text colors (be careful with order)
  [/\btext-gray-900(?!\s+dark:)/g, 'text-gray-900 dark:text-white'],
  [/\btext-gray-800(?!\s+dark:)/g, 'text-gray-800 dark:text-gray-200'],
  [/\btext-gray-700(?!\s+dark:)/g, 'text-gray-700 dark:text-gray-300'],

  // Hover states
  [/\bhover:bg-gray-50(?!\s+dark:)/g, 'hover:bg-gray-50 dark:hover:bg-white/5'],
  [/\bhover:text-gray-700(?!\s+dark:)/g, 'hover:text-gray-700 dark:hover:text-gray-300'],
  [/\bhover:text-gray-800(?!\s+dark:)/g, 'hover:text-gray-800 dark:hover:text-gray-200'],
  [/\bhover:bg-gray-100(?!\s+dark:)/g, 'hover:bg-gray-100 dark:hover:bg-white/10'],
  [/\bhover:border-gray-300(?!\s+dark:)/g, 'hover:border-gray-300 dark:hover:border-white/10'],

  // Don't add dark variants to text-gray-500, text-gray-400 - they work in both themes
  // But do handle divide
  [/\bdivide-white\/\[0\.04\]/g, 'divide-gray-100 dark:divide-white/[0.04]'],

  // bg-white/[0.06] (form inputs) → proper light/dark
  [/\bbg-white\/\[0\.06\](?!\s+dark:)/g, 'bg-white dark:bg-white/[0.06]'],
  // bg-white/[0.04] → needs dark treatment
  [/\bbg-white\/\[0\.04\](?!\s+dark:)/g, 'bg-gray-50 dark:bg-white/[0.04]'],
  // bg-white/[0.03] 
  [/\bbg-white\/\[0\.03\]/g, 'bg-gray-50 dark:bg-white/[0.03]'],
  // bg-white/[0.02]
  [/\bbg-white\/\[0\.02\]/g, 'bg-gray-50 dark:bg-white/[0.02]'],

  // border-dashed for upload areas
  [/\bborder-dashed border-gray-200(?!\s+dark:)/g, 'border-dashed border-gray-200 dark:border-white/[0.06]'],
];

let totalChanges = 0;

for (const relPath of files) {
  const fullPath = resolve('c:/wamp64/www/cabu-digital', relPath);
  let content;
  try {
    content = readFileSync(fullPath, 'utf8');
  } catch {
    console.log(`⏭ SKIP (not found): ${relPath}`);
    continue;
  }

  let modified = content;
  let fileChanges = 0;

  for (const [search, replace] of replacements) {
    const before = modified;
    modified = modified.replace(search, replace);
    if (modified !== before) {
      const count = (before.match(search) || []).length;
      fileChanges += count;
    }
  }

  if (modified !== content) {
    writeFileSync(fullPath, modified, 'utf8');
    console.log(`✅ ${relPath} — ${fileChanges} changes`);
    totalChanges += fileChanges;
  } else {
    console.log(`⏭ ${relPath} — no changes needed`);
  }
}

console.log(`\nDone! ${totalChanges} total replacements across all files.`);

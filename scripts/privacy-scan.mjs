import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TEXT_EXTENSIONS = new Set([
  '.css', '.html', '.js', '.json', '.md', '.mjs', '.svg', '.txt', '.xml', '.yml', '.yaml'
]);

const STATIC_RULES = [
  {
    id: 'local-path',
    pattern: /(?:[a-z]:\\|\/users\/|\/home\/)[^\s'"<>]*/giu
  },
  {
    id: 'secret',
    pattern: /(?:api[_-]?token|password|secret|hashkey|hashiv|webhook(?:_url)?)\s*[:=]\s*["']?[^\s"']{8,}/giu
  }
];

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function forbiddenRule(terms) {
  const cleaned = terms.map((term) => term.trim()).filter(Boolean);
  if (cleaned.length === 0) return null;
  return {
    id: 'forbidden-source',
    pattern: new RegExp(cleaned.map(escapePattern).join('|'), 'giu')
  };
}

function environmentTerms() {
  const raw = process.env.PRIVACY_FORBIDDEN_TERMS;
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== 'string')) {
    throw new TypeError('PRIVACY_FORBIDDEN_TERMS must be a JSON array of strings.');
  }
  return parsed;
}

function decodeForScan(input) {
  let output = input;
  for (let pass = 0; pass < 2; pass += 1) {
    try {
      const decoded = decodeURIComponent(output);
      if (decoded === output) break;
      output = decoded;
    } catch {
      break;
    }
  }
  return output;
}

async function collectFiles(target) {
  const details = await stat(target);
  if (details.isFile()) return [target];

  const files = [];
  for (const entry of await readdir(target, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const entryPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
}

function safeExcerpt(rule, match) {
  if (rule === 'secret') return '[REDACTED SECRET-LIKE VALUE]';
  return match.length > 80 ? `${match.slice(0, 77)}...` : match;
}

export async function scanPaths(paths, { forbiddenTerms = environmentTerms() } = {}) {
  const findings = [];
  const sourceRule = forbiddenRule(forbiddenTerms);
  const rules = sourceRule ? [sourceRule, ...STATIC_RULES] : STATIC_RULES;
  for (const target of paths) {
    for (const file of await collectFiles(path.resolve(target))) {
      if (!TEXT_EXTENSIONS.has(path.extname(file).toLowerCase())) continue;
      const normalized = decodeForScan(await readFile(file, 'utf8'));
      for (const { id, pattern } of rules) {
        pattern.lastIndex = 0;
        for (const match of normalized.matchAll(pattern)) {
          findings.push({
            file,
            rule: id,
            excerpt: safeExcerpt(id, match[0])
          });
        }
      }
    }
  }
  return findings;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  const findings = await scanPaths(process.argv.slice(2));
  if (findings.length > 0) {
    console.error(JSON.stringify(findings, null, 2));
    process.exitCode = 1;
  } else {
    console.log('Privacy scan passed: 0 findings.');
  }
}

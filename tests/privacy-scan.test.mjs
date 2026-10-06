import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { scanPaths } from '../scripts/privacy-scan.mjs';

async function withFixture(files, run) {
  const root = await mkdtemp(path.join(tmpdir(), 'golden-himal-scan-'));
  try {
    for (const [relativePath, content] of Object.entries(files)) {
      const target = path.join(root, relativePath);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content, 'utf8');
    }
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('flags caller-provided source markers case-insensitively and when URL encoded', async () => {
  await withFixture({
    'mixed.txt': 'A PRIVATE-SOURCE-MARKER archive and %70%72%69%76%61%74%65-source-marker.'
  }, async (root) => {
    const findings = await scanPaths([root], { forbiddenTerms: ['private-source-marker'] });
    assert.equal(findings.filter(({ rule }) => rule === 'forbidden-source').length, 2);
  });
});

test('flags local drive paths and secret-shaped values without echoing the secret', async () => {
  const secretValue = 'abc1234567890-secret-value';
  const localPath = ['D:', '\\', 'internal', '\\', 'plan.txt'].join('');
  const secretKey = ['api', 'token'].join('_');
  await withFixture({
    'unsafe.txt': `${localPath}\n${secretKey}=${secretValue}`
  }, async (root) => {
    const findings = await scanPaths([root]);
    assert.ok(findings.some(({ rule }) => rule === 'local-path'));
    const secretFinding = findings.find(({ rule }) => rule === 'secret');
    assert.ok(secretFinding);
    assert.equal(secretFinding.excerpt.includes(secretValue), false);
  });
});

test('returns no findings for neutral public copy', async () => {
  await withFixture({
    'safe.txt': 'Golden Himal Voice welcomes singers aged 18 and above.'
  }, async (root) => {
    assert.deepEqual(await scanPaths([root]), []);
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('Cloudflare deploys static preview assets only, not unfinished voting backend',async()=>{
  const raw=await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8');
  const cfg=JSON.parse(raw);
  assert.equal(cfg.name,'golden-himal-voice-preview');
  assert.equal(cfg.assets.directory,'./dist');
  assert.equal(Object.hasOwn(cfg,'main'),false,'Do not deploy backend/src/index.js as public preview');
  assert.equal(Object.hasOwn(cfg,'d1_databases'),false,'Do not bind live voter DB to a static preview');
  assert.equal(Object.hasOwn(cfg,'vars'),false,'No credentials or private settings in public Wrangler config');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const entries = ['start.html', 'level-1.html', 'level-2.html', 'level-3.html'];

test('html entry files exist and load a module script', () => {
  for (const file of entries) {
    assert.equal(existsSync(file), true, `${file} should exist`);
    const html = readFileSync(file, 'utf8');
    assert.match(html, /<script type="module" src="\/src\/.+\.js"><\/script>/);
  }
});

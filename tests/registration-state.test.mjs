import assert from 'node:assert/strict';
import test from 'node:test';

import { getRegistrationState } from '../src/scripts/registration.js';

test('registration state is preview-only', () => {
  assert.deepEqual(getRegistrationState(), {
    status: 'preview',
    message: 'Registration is not open yet. Updates will appear here.'
  });
});

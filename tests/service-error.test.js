import test from 'node:test';
import assert from 'node:assert/strict';
import {chatServiceError} from '../lib/mentor/service-error.js';
test('provider failures distinguish credentials and limits without leaking details', () => {
  for (const status of [401,403]) {
    const result = chatServiceError({status, message:'secret-provider-payload'});
    assert.equal(result.code, 'AI_AUTH_FAILED');
    assert.ok(!JSON.stringify(result).includes('secret-provider-payload'));
  }
  assert.equal(chatServiceError({status:429}).code, 'AI_RATE_LIMITED');
  assert.equal(chatServiceError(new Error('private')).code, 'AI_UNAVAILABLE');
});

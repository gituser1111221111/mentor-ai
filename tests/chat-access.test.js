import test from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV = 'test';
const {createServer} = await import('../server.js');

test('production shows the membership message and blocks chat and voice', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const oldEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const page = await (await fetch(base)).text();
    assert.match(page, /Chat requires a paid membership/);
    assert.match(page, /Subscriptions are not available yet/);
    for (const path of ['/api/chat','/api/repick','/api/compare','/api/expand','/api/voice/transcribe','/api/voice/speak']) {
      const response = await fetch(base + path, {method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
      assert.equal(response.status, 402, path);
      assert.equal((await response.json()).code, 'MEMBERSHIP_REQUIRED');
    }
    assert.equal((await fetch(base + '/api/health')).status, 200);
  } finally {
    process.env.NODE_ENV = oldEnv;
    await new Promise(resolve => server.close(resolve));
  }
});

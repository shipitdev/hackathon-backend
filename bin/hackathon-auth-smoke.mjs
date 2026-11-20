import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';

const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } = process.env;
assert(APPWRITE_ENDPOINT && APPWRITE_PROJECT_ID, 'Set APPWRITE_ENDPOINT and APPWRITE_PROJECT_ID for a disposable project.');
const endpoint = new URL(APPWRITE_ENDPOINT);
assert(!endpoint.username && !endpoint.password && !endpoint.search && !endpoint.hash,
  'Use an endpoint URL without credentials, a query string, or a fragment.');
assert(endpoint.protocol === 'https:' || (
  endpoint.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname)
), 'Use HTTPS or a loopback HTTP endpoint.');
assert(endpoint.pathname.replace(/\/$/, '').endsWith('/v1'), 'The endpoint must include /v1.');

async function request(path, status, { method = 'GET', body, cookie } = {}) {
  const response = await fetch(endpoint.href.replace(/\/$/, '') + path, {
    method,
    redirect: 'error',
    headers: {
      'X-Appwrite-Project': APPWRITE_PROJECT_ID,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  assert.equal(response.status, status, `${method} ${path}`);
  return response;
}

const userId = randomUUID();
const email = `smoke+${userId}@example.com`;
const password = randomBytes(24).toString('base64url');
await request('/account', 401);
await request('/account', 201, { method: 'POST', body: { userId, email, password } });
const session = await request('/account/sessions/email', 201, { method: 'POST', body: { email, password } });
const cookie = session.headers.getSetCookie().map(value => value.split(';', 1)[0]).join('; ');
assert(cookie, 'Appwrite did not return a session cookie.');
const account = await request('/account', 200, { cookie });
assert.equal((await account.json()).$id, userId);
await request('/account/sessions/current', 204, { method: 'DELETE', cookie });
await request('/account', 401, { cookie });
console.log('Registration, sign-in, account lookup, and logout passed.');

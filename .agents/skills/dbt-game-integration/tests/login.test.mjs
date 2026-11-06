import test from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT } from 'jose';
import { verifyPortalLogin } from '../assets/examples/verify-login.mjs';

const settings = { secret: 'test-only-secret-not-a-deployment-value', audience: 'mygame' };
const key = new TextEncoder().encode(settings.secret);
const identity = { user_id: 123, username: 'player', sub: 'player' };
const sign = (claims, audience = 'mygame', expiration = '5m', secret = key) => new SignJWT(claims)
  .setProtectedHeader({ alg: 'HS256' }).setIssuer('main-portal')
  .setAudience(audience).setExpirationTime(expiration).sign(secret);

test('verified login maps numeric portal ID rather than username or local UUID', async () => {
  assert.deepEqual(await verifyPortalLogin(await sign(identity), settings), { portalUserId: 123, username: 'player' });
});

test('rejects other-game, expired, forged, malformed, and non-login credentials', async () => {
  for (const token of [
    await sign(identity, 'another-game'),
    await sign(identity, 'mygame', 1),
    await sign(identity, 'mygame', '5m', new TextEncoder().encode('wrong-test-secret')),
    await sign({ ...identity, user_id: '123' }),
    await sign({ ...identity, user_id: true }),
    await sign({ ...identity, user_id: 0 }),
    await sign({ ...identity, user_id: 2147483648 }),
    await new SignJWT(identity).setProtectedHeader({ alg: 'HS256' }).setIssuer('wrong-issuer').setAudience('mygame').setExpirationTime('5m').sign(key),
    await new SignJWT(identity).setProtectedHeader({ alg: 'HS256' }).setIssuer('main-portal').setAudience('mygame').sign(key),
    await new SignJWT(identity).setProtectedHeader({ alg: 'HS384' }).setIssuer('main-portal').setAudience('mygame').setExpirationTime('5m').sign(key),
    await sign({ ...identity, purpose: 'ai-review', purchase_id: 'test' }),
    await sign({ user_id: 123, purpose: 'mygame-inventory' }),
  ]) await assert.rejects(verifyPortalLogin(token, settings));
  const [header, payload, signature] = (await sign(identity)).split('.');
  const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url')), user_id: 456 })).toString('base64url');
  await assert.rejects(verifyPortalLogin(`${header}.${forged}.${signature}`, settings));
});

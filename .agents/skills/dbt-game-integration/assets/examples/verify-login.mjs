import { jwtVerify } from 'jose';

/** Verify a portal login token on the game backend before provisioning a player. */
export async function verifyPortalLogin(token, settings) {
  const { secret, audience, issuer = 'main-portal', algorithm = 'HS256' } = settings;
  if (typeof secret !== 'string' || !secret.trim() || !audience || !issuer) {
    throw new Error('portal_signing_not_configured');
  }
  if (algorithm !== 'HS256') {
    throw new Error('example_supports_hs256_only');
  }
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
    algorithms: [algorithm],
    issuer,
    audience,
    requiredClaims: ['exp', 'iss', 'aud', 'user_id', 'sub', 'username'],
  });
  if (!Number.isInteger(payload.user_id) || payload.user_id < 1
      || payload.user_id > 2147483647
      || typeof payload.username !== 'string' || !payload.username.trim()
      || typeof payload.sub !== 'string' || payload.sub !== payload.username
      || Object.hasOwn(payload, 'purpose')) {
    throw new Error('invalid_portal_login_claims');
  }
  return { portalUserId: payload.user_id, username: payload.username };
}

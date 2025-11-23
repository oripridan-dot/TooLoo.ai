// lib/edge-signing.js
import crypto from 'crypto';

export function signRequest(body, secret, ts = Date.now()) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body||'');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload + ts);
  return { signature: hmac.digest('hex'), ts };
}

export function verifyRequest(body, signature, ts, secret, maxSkewMs = 60000) {
  if (!signature || !ts) return false;
  const now = Date.now();
  if (Math.abs(now - ts) > maxSkewMs) return false;
  const payload = typeof body === 'string' ? body : JSON.stringify(body||'');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload + ts);
  return hmac.digest('hex') === signature;
}

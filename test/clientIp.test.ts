import { test } from "node:test";
import assert from "node:assert/strict";
import { clientIp } from "../lib/rateLimit";

// ── Source-IP trust boundary (pure, runs anywhere) ──────────────────────────
// These cover the spoofing and shared-bucket paths. TRUSTED_PROXY_HOPS is read
// at module load, so these all exercise the default (0) = Vercel posture,
// where the edge overwrites X-Forwarded-For and the leftmost entry is trusted.

const reqWith = (headers: Record<string, string>) =>
  new Request("https://example.test/", { headers });

test("clientIp reads the leftmost X-Forwarded-For entry (Vercel posture)", () => {
  assert.equal(clientIp(reqWith({ "x-forwarded-for": "203.0.113.7" })), "203.0.113.7");
  assert.equal(
    clientIp(reqWith({ "x-forwarded-for": "203.0.113.7, 70.41.3.18" })),
    "203.0.113.7",
  );
});

test("clientIp falls back to x-real-ip only when XFF is absent or junk", () => {
  assert.equal(clientIp(reqWith({ "x-real-ip": "198.51.100.4" })), "198.51.100.4");
  assert.equal(
    clientIp(reqWith({ "x-forwarded-for": "not-an-ip", "x-real-ip": "198.51.100.4" })),
    "198.51.100.4",
  );
});

test("clientIp returns null rather than a shared bucket for un-attributable requests", () => {
  // Regression: these previously collapsed to the literal "unknown", so every
  // un-attributable request shared one counter and one attacker could exhaust
  // the limit for every other client.
  assert.equal(clientIp(reqWith({})), null);
  assert.equal(clientIp(reqWith({ "x-forwarded-for": "" })), null);
  assert.equal(clientIp(reqWith({ "x-forwarded-for": "   " })), null);
  assert.equal(clientIp(reqWith({ "x-forwarded-for": ", ," })), null);
});

test("clientIp rejects malformed and out-of-range addresses", () => {
  assert.equal(clientIp(reqWith({ "x-forwarded-for": "999.1.1.1" })), null);
  assert.equal(clientIp(reqWith({ "x-forwarded-for": "1.2.3" })), null);
  assert.equal(clientIp(reqWith({ "x-forwarded-for": "<script>alert(1)</script>" })), null);
  assert.equal(clientIp(reqWith({ "x-forwarded-for": "a".repeat(200) })), null);
});

test("clientIp accepts IPv6 and v4-mapped forms", () => {
  assert.equal(clientIp(reqWith({ "x-forwarded-for": "2001:db8::1" })), "2001:db8::1");
  assert.equal(clientIp(reqWith({ "x-forwarded-for": "::ffff:203.0.113.7" })), "::ffff:203.0.113.7");
});

test("a spoofed key cannot collide with another client's bucket", () => {
  // The bucket key is `${prefix}:${ip}`; rejecting junk means an attacker
  // cannot inject a delimiter or forge another client's IP into the key.
  assert.equal(clientIp(reqWith({ "x-forwarded-for": "1.2.3.4:extra" })), null);
  assert.equal(clientIp(reqWith({ "x-forwarded-for": "login:203.0.113.9" })), null);
});

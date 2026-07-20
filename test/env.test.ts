import { test } from "node:test";
import assert from "node:assert/strict";
import { validateEnv, assertEnv } from "../lib/env";

// Pure — no DB, no network. Runs everywhere.

const SECRET = "x".repeat(32);

const minimalDev = {
  DATABASE_URL: "postgresql://u:p@host:5432/db",
  JWT_SECRET: SECRET,
  JWT_REFRESH_SECRET: SECRET,
  JWT_RESET_SECRET: SECRET,
};

const fullProd = {
  ...minimalDev,
  NEXT_PUBLIC_APP_URL: "https://wmnyshiftswap.com",
  RESEND_API_KEY: "re_test",
  EMAIL_FROM: "We Move NY <noreply@wmnyshiftswap.com>",
  CRON_SECRET: "cron",
  VAPID_PUBLIC_KEY: "pub",
  VAPID_PRIVATE_KEY: "priv",
  VAPID_EMAIL: "mailto:admin@wmnyshiftswap.com",
  UPSTASH_REDIS_REST_URL: "https://db.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "tok",
};

test("dev needs only the always-required vars", () => {
  assert.equal(validateEnv(minimalDev, false).ok, true);
});

test("production additionally requires the production-only vars", () => {
  const r = validateEnv(minimalDev, true);
  assert.equal(r.ok, false);
  // Every production-only var should be reported, not just the first.
  assert.ok(r.problems.some((p) => p.startsWith("CRON_SECRET")));
  assert.ok(r.problems.some((p) => p.startsWith("UPSTASH_REDIS_REST_URL")));
  assert.equal(validateEnv(fullProd, true).ok, true);
});

test("missing and empty/whitespace-only values are both rejected", () => {
  for (const bad of [undefined, "", "   "]) {
    const env = { ...minimalDev, JWT_SECRET: bad };
    const r = validateEnv(env, false);
    assert.equal(r.ok, false, `JWT_SECRET=${JSON.stringify(bad)} should fail`);
    assert.ok(r.problems.some((p) => p.includes("JWT_SECRET is missing")));
  }
});

test("shape checks: DATABASE_URL scheme, secret length, URL validity", () => {
  const badScheme = validateEnv({ ...minimalDev, DATABASE_URL: "mysql://h/db" }, false);
  assert.ok(badScheme.problems.some((p) => p.includes("postgresql://")));

  const shortSecret = validateEnv({ ...minimalDev, JWT_SECRET: "tooshort" }, false);
  assert.ok(shortSecret.problems.some((p) => p.includes("at least 32 characters")));

  const badUrl = validateEnv({ ...fullProd, NEXT_PUBLIC_APP_URL: "wmnyshiftswap.com" }, true);
  assert.ok(badUrl.problems.some((p) => p.includes("absolute URL")));
});

test("TRUSTED_PROXY_HOPS: optional, but garbage is rejected", () => {
  // Absent and empty are fine — the default (0) is the Vercel posture.
  assert.equal(validateEnv(minimalDev, false).ok, true);
  assert.equal(validateEnv({ ...minimalDev, TRUSTED_PROXY_HOPS: "" }, false).ok, true);
  assert.equal(validateEnv({ ...minimalDev, TRUSTED_PROXY_HOPS: "0" }, false).ok, true);
  assert.equal(validateEnv({ ...minimalDev, TRUSTED_PROXY_HOPS: "2" }, false).ok, true);
  // A NaN here would silently change which XFF hop is trusted.
  for (const bad of ["abc", "-1", "1.5"]) {
    const r = validateEnv({ ...minimalDev, TRUSTED_PROXY_HOPS: bad }, false);
    assert.equal(r.ok, false, `TRUSTED_PROXY_HOPS=${bad} should fail`);
  }
});

test("assertEnv throws listing every problem, and never leaks a value", () => {
  const leaky = {
    ...minimalDev,
    DATABASE_URL: "postgresql://admin:SUPERSECRETPASSWORD@host:5432/db",
    JWT_SECRET: "SHORTSECRETVALUE",
  };

  assert.throws(
    () => assertEnv(leaky),
    (e: Error) => {
      assert.ok(e.message.includes("JWT_SECRET"), "names the offending variable");
      assert.ok(!e.message.includes("SUPERSECRETPASSWORD"), "must not echo a connection string");
      assert.ok(!e.message.includes("SHORTSECRETVALUE"), "must not echo a secret value");
      return true;
    },
  );

  assert.doesNotThrow(() => assertEnv(minimalDev));
});

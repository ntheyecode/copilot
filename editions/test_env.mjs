// TEST ONLY: the environment for a server started as a child process in a
// test. Starts from the parent env (PATH, SystemRoot and the like) but drops
// everything that could point the child at real infrastructure or change its
// behavior: database, keys, Stripe, mail, edition, and the test-runner marker.
const DROP = /^(WORK_|STRIPE_|SMTP_|SES_|AWS_|PG|DATABASE_URL$|SESSION_SECRET$|NODE_TEST_CONTEXT$)/

export function cleanChildEnv(extra = {}) {
  const env = {}
  for (const [k, v] of Object.entries(process.env)) if (!DROP.test(k)) env[k] = v
  return { ...env, ...extra }
}

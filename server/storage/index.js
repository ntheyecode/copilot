// Storage entry point: config -> driver. The store calls openStorage() once and
// talks to the driver contract (load / save / migrate / status / close; see
// json_driver.js). With no WORK_DB_* settings this is the json driver, the
// original db.json persistence.
import { storageConfig } from './config.js'
import { createJsonDriver } from './json_driver.js'
import { createPostgresDriver } from './postgres_driver.js'

export function openStorage({ dataDir, env = process.env, mode = 'server' } = {}) {
  const cfg = storageConfig(env, { dataDir })
  if (cfg.driver === 'json') return createJsonDriver({ dataDir })
  return createPostgresDriver(cfg, { mode })
}

export { storageConfig, redactDbUrl } from './config.js'

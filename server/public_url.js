// ===========================================================================
// WorkCoPilot public origin: the ONE place the app's public base URL is read
// (links in emails, launch links handed to customer apps, the OpenAPI servers
// entry). Set WORK_PUBLIC_URL for on-premise or development installs.
// ===========================================================================
export const PUBLIC_BASE = (process.env.WORK_PUBLIC_URL || 'https://admireveda.com').replace(/\/+$/, '')

export default { PUBLIC_BASE }

// Present only inside the Electron shell (preload exposes this bridge); undefined on web.
export const isDesktop = typeof window !== 'undefined' && !!window.refigold

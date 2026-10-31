// Where the WEB floater (the browser's always-on-top Picture-in-Picture window,
// or a pop-out) is offered. One rule, read by the guiding console.
//
// Owner rule (2026-10-31): corporate users float the steps through the desktop
// software only, never a web component; individuals (the personal plans) keep
// the web floater, it is a key part of their product. The desktop app floats
// natively, and a phone runs full screen, so neither gets the web floater.
export function webFloatAllowed({ user = null, desktop = false, mobile = false } = {}) {
  if (desktop || mobile) return false
  return !(user && user.companyId)
}

// What a company member sees where the web floater would be: the desktop app.
export function desktopFloatPointer({ user = null, desktop = false, mobile = false } = {}) {
  return !desktop && !mobile && !!(user && user.companyId)
}

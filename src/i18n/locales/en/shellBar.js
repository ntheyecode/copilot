// English strings for the DESKTOP title bar / window chrome (src/workShell.jsx):
// the frameless-window Fluent bar with the overlay toggles (On top, See-through,
// Click-behind, Buddy) and the window caption buttons (Minimize, Close). One
// partial per i18n wave, deep-merged into the English base by src/i18n/index.jsx
// under the `shellBar` namespace. (The `workShell` namespace is already taken by
// the in-app shell chrome - WorkAppLayout / PlanPill / etc. - so this distinct
// surface uses its own `shellBar` namespace, per the no-collision rule.) The
// Ctrl+Shift+Alt+... hotkey hints are part of the translatable tooltip text and
// stay inside the value as literal text. US spelling; no em dashes; the product
// name stays as-is.
export default {
  shellBar: {
    toolbarAria: 'Overlay controls',
    onTop: 'On top',
    onTopTip: 'Keep WorkCoPilot above other windows (Ctrl+Shift+Alt+T)',
    seeThroughTip: 'See-through: let the work behind show through (Ctrl+Shift+Alt+O)',
    clickBehind: 'Click-behind',
    buddy: 'Buddy',
    buddyTip: 'Shrink to the buddy card (Ctrl+Shift+Alt+B)',
    minimize: 'Minimize',
    close: 'Close',
    shareHiddenTip: 'Hidden from screen shares - click to show it on a share (Ctrl+Shift+Alt+S)',
    shareVisibleTip: 'Visible on screen shares - click to hide it again (Ctrl+Shift+Alt+S)',
    shareHidden: 'Hidden',
    shareOn: 'On share',
    seeThrough: 'See-through',
    clickBehindOnTip: 'Click-behind is on: your clicks pass to the app underneath. This bar still takes clicks. Click here or press Ctrl+Shift+Alt+W to turn it off.',
    clickBehindOffTip: 'Click-behind: let your clicks pass to the app underneath. This bar stays clickable so you can turn it off again (Ctrl+Shift+Alt+W).',
    clickBehindIdleTip: 'Click-behind is available while guiding',
    restore: 'Restore',
    maximize: 'Maximize',
    maximizeCentered: 'Maximize (centered)',
    fullScreenTip: 'Full screen (fills the screen, good on a second monitor)',
  },
}

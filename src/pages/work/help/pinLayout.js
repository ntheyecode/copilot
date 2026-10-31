// Where each numbered pin of an annotated screenshot sits (pure, unit-tested in
// help_shots.test.mjs). A pin goes on its region's top-left corner unless that
// lands on an earlier pin (two regions stacked or side by side), in which case
// it takes the first free corner of its own region: top-right, bottom-left,
// bottom-right. "Free" is measured relative to the image width, so pins stay
// apart at any display size (the pin is 26px at most, the image never shown
// narrower than about 300px, so 9% of the width keeps them from touching).
export const PIN_GAP = 0.09

export function pinPositions(boxes, imageWidth) {
  const gap = PIN_GAP * imageWidth
  const placed = []
  for (const [x, y, w, h] of boxes) {
    const corners = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]
    // Room around a corner = distance to the nearest pin already placed.
    const room = ([cx, cy]) => placed.reduce((m, [px, py]) => Math.min(m, Math.hypot(cx - px, cy - py)), Infinity)
    const free = corners.find((c) => room(c) >= gap)
    // No corner is free (a tiny region boxed in by others): take the roomiest one.
    placed.push(free || corners.reduce((best, c) => (room(c) > room(best) ? c : best)))
  }
  return placed
}

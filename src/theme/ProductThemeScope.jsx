import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { setInProduct } from './prefs.js'

// Every signed-in console paints the user's theme mode (light, dark or heavy);
// the public site stays light. ONE route-level scope wraps the /work shell AND
// the standalone consoles (admin, company, executive, Teach studio, Workflow
// issues, launch), so no console can forget it: before, only the /work shell
// turned it on and the standalone consoles stayed light in dark mode.
// Gate: src/theme/product_scope.test.mjs.
export default function ProductThemeScope() {
  useEffect(() => { setInProduct(true); return () => setInProduct(false) }, [])
  return <Outlet />
}

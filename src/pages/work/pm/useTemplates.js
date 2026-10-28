// Data hooks for the project-templates pages: thin wrappers over src/api.js on
// the shared useLoad (StrictMode-safe, 403 kept distinct as 'denied'). Every
// hook exposes reload so a mutation re-reads the one source of truth.
import { api } from '../../../api.js'
import { useLoad } from './usePm.js'
import { sortTemplates } from './templatesModel.js'

export function useTemplates(enabled = true) {
  const r = useLoad(() => api.workTemplates(), [], { enabled })
  return { ...r, templates: sortTemplates(r.data && r.data.templates) }
}
export function useTemplateRollup(id) {
  const r = useLoad(() => api.workTemplateRollup(id), [id], { enabled: !!id })
  return { ...r, rollup: r.data || null }
}

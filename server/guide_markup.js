// Guide's step-text convention marks the one control to act on in **bold** (and
// sometimes `code`). Surfaces that show a step as plain text (the Workflow
// issues inbox, the integration API, prompts that quote a label) must not show
// those markers. This is the ONE rule for removing them; callers used to carry
// their own copy of the regex.
export function stripGuideMarkup(v) {
  return String(v == null ? '' : v).replace(/[*`]+/g, '')
}

export default { stripGuideMarkup }

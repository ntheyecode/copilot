// English strings for the shared Help primitives (src/pages/workadmin/sections/
// _help.jsx: HelpFlow, HelpArea). Keyed under the `helpShared` namespace; the
// i18n loader deep-merges every en/*.js partial into the English base, so this
// file owns its own namespace and never collides with the other i18n waves.
// The Help pages (HelpCompany/HelpSuper) own their own copy and pass it in as
// props; only the two built-in strings of the primitives live here.
export default {
  helpShared: {
    flowLabel: 'The main flow',
    open: 'Open {label}',
  },
}

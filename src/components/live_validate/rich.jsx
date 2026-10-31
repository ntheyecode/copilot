// Inline text in the live validator's console: the shared RichText with the
// console's accent, bare URLs as real links, shortcuts as key chips, and a Copy
// chip after any code span long enough to be a command or dependency line
// (never a code span the visitor cannot copy). ONE definition for every part
// of the console (answer, steps, teaser, corrections).
import RichText from '../RichText.jsx'

export const ACCENT = '#8cf5c4'
const COPY_OVER = 24
export default function Rich({ text }) {
  return <RichText text={text} accent={ACCENT} links keys copyOver={COPY_OVER} />
}

// The product's logo for this edition: LinkNotes for the individuals audience,
// AdmireVeda WorkCoPilot otherwise (server/brand.js decides the brand; this
// mirrors it for the mark and the lockup). Every surface imports from here, so
// no page can show the wrong product's logo (gate: brand_logo.test.mjs).
import AdmireVedaLogo, { AVMark } from '../AdmireVedaLogo.jsx'
import LinkNotesLogo, { LinkNotesMark } from './LinkNotesLogo.jsx'
import { useEditionView } from '../../edition/useCaps.js'
import { brandForAudience } from '../../../server/brand.js'

const isLinkNotes = (audience) => brandForAudience(audience).id === 'linknotes'

// The mark alone (AVMark's props: size, id, glow).
export function BrandMark({ size = 30, id = 'av', glow = true }) {
  const { audience } = useEditionView()
  return isLinkNotes(audience) ? <LinkNotesMark size={size} id={`ln-${id}`} /> : <AVMark size={size} id={id} glow={glow} />
}

// The full lockup (AdmireVedaLogo's props: size, product, onDark, idSuffix).
export default function BrandLogo({ size = 28, product = true, onDark = false, idSuffix = '' }) {
  const { audience } = useEditionView()
  return isLinkNotes(audience)
    ? <LinkNotesLogo size={size} variant="full" onDark={onDark} idSuffix={idSuffix} product={product} />
    : <AdmireVedaLogo size={size} product={product} onDark={onDark} idSuffix={idSuffix} />
}

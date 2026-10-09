import katex from 'katex'
import 'katex/dist/katex.min.css'
import { useMemo } from 'react'

/** Rendu KaTeX. strict: 'ignore' autorise les accents français dans \text{}. */
export default function Tex({ math, display = false, className = '' }: { math: string; display?: boolean; className?: string }) {
  const html = useMemo(
    () => katex.renderToString(math, { displayMode: display, throwOnError: false, strict: 'ignore' }),
    [math, display],
  )
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
}

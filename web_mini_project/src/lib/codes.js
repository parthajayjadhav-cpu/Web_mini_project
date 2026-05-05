/** Client-side preview generator for the Create-tab "Generate Code" affordance.
 *  The server still mints the canonical code on workspace creation — this is
 *  purely so users see something tangible while filling out the form.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function previewCode(len = 5) {
  let s = ''
  for (let i = 0; i < len; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return s
}

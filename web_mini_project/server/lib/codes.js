import { Store } from '../models/Workspace.js'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // ambiguous chars (I, O, 0, 1) removed

export function makeCode(len = 5) {
  let s = ''
  const buf = new Uint8Array(len)
  crypto.getRandomValues(buf)
  for (let i = 0; i < len; i++) s += ALPHABET[buf[i] % ALPHABET.length]
  return s
}

export async function makeUniqueCode(len = 5) {
  for (let i = 0; i < 8; i++) {
    const candidate = makeCode(len)
    if (!(await Store.exists(candidate))) return candidate
  }
  // After 8 collisions, widen the alphabet/length.
  return makeCode(len + 1)
}

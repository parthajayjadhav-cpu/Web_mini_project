/** Initials — up to 2 chars, uppercase, derived from name segments. */
export function initials(name = '') {
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

/** Deterministic warm-toned HSL color hashed from a name. */
export function colorFromName(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0
  }
  // Bias the hue toward warm/teal arcade tones (avoid purples/pinks).
  const hue = (Math.abs(h) % 60) + (Math.abs(h) >> 2) % 2 === 0 ? 30 + (Math.abs(h) % 30) : 170 + (Math.abs(h) % 20)
  const sat = 65
  const light = 55
  return `hsl(${hue} ${sat}% ${light}%)`
}

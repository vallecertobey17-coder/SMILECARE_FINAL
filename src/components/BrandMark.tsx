/** SMILECare logo — "Happy Capsule": a smiling medicine capsule with a health sparkle. */
const BLUE = (
  <>
    <g transform="rotate(-32 32 32)">
      <path d="M21 20h11v24H21a12 12 0 0 1 0-24z" fill="#006398" />
      <path d="M32 20h11a12 12 0 0 1 0 24H32z" fill="#2a9fd8" />
      <circle cx="26" cy="29" r="2.4" fill="#fff" />
      <circle cx="38" cy="29" r="2.4" fill="#fff" />
      <path d="M25 35c4.3 4 9.7 4 14 0" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>
    <path d="M50 8v8M46 12h8" stroke="#2a9fd8" strokeWidth="2.6" strokeLinecap="round" />
  </>
)
const WHITE = (
  <>
    <g transform="rotate(-32 32 32)">
      <path d="M21 20h11v24H21a12 12 0 0 1 0-24z" fill="#fff" />
      <path d="M32 20h11a12 12 0 0 1 0 24H32z" fill="#cfe8fb" />
      <circle cx="26" cy="29" r="2.4" fill="#006398" />
      <circle cx="38" cy="29" r="2.4" fill="#006398" />
      <path d="M25 35c4.3 4 9.7 4 14 0" stroke="#006398" strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>
    <path d="M50 8v8M46 12h8" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
  </>
)

export function BrandMark({ size = 48, light }: { size?: number; light?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      {light ? WHITE : BLUE}
    </svg>
  )
}

/** Mark + "SMILECare" wordmark. */
export function BrandLogo({ size = 48, light, tagline }: { size?: number; light?: boolean; tagline?: string }) {
  return (
    <span className={`brand-logo ${light ? 'light' : ''}`} style={{ ['--bl' as string]: `${size}px` }} aria-label="SMILECare">
      <BrandMark size={size} light={light} />
      <span className="brand-wm">
        <span className="brand-name">
          <b>SMILE</b>
          <i>Care</i>
        </span>
        {tagline && <small>{tagline}</small>}
      </span>
    </span>
  )
}

/** Same mark as an SVG data URI (browser tab icon). */
export const BRAND_MARK_DATA_URI =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g transform="rotate(-32 32 32)"><path d="M21 20h11v24H21a12 12 0 0 1 0-24z" fill="#006398"/><path d="M32 20h11a12 12 0 0 1 0 24H32z" fill="#2a9fd8"/><circle cx="26" cy="29" r="2.4" fill="#fff"/><circle cx="38" cy="29" r="2.4" fill="#fff"/><path d="M25 35c4.3 4 9.7 4 14 0" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/></g><path d="M50 8v8M46 12h8" stroke="#2a9fd8" stroke-width="2.6" stroke-linecap="round"/></svg>',
  )

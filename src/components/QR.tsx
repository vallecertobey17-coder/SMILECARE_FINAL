import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

/** QR code for a SMILECare Health ID. Staff scanners read the text as keyboard input. */
export function QR({ value, size = 180, label }: { value: string; size?: number; label?: string }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let alive = true
    QRCode.toDataURL(value, { margin: 1, width: size * 2, color: { dark: '#00324d', light: '#ffffff' } })
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(''))
    return () => {
      alive = false
    }
  }, [value, size])
  return src ? (
    <img src={src} width={size} height={size} alt={label ?? `QR code for ${value}`} className="qr-img" />
  ) : (
    <div className="qr-img" style={{ width: size, height: size }} aria-label="Generating QR code" />
  )
}

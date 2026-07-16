const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024
const MIN_LOGO_DIMENSION = 256

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

type ImageDimensions = { width: number; height: number }

function readPngDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 24 || String.fromCharCode(...bytes.slice(1, 4)) !== 'PNG') return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

function readJpegDimensions(bytes: Uint8Array): ImageDimensions | null {
  let offset = 2
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return null
    const marker = bytes[offset + 1]
    const length = view.getUint16(offset + 2)
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { width: view.getUint16(offset + 7), height: view.getUint16(offset + 5) }
    }
    if (length < 2) return null
    offset += length + 2
  }

  return null
}

function readWebpDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 30 || String.fromCharCode(...bytes.slice(0, 4)) !== 'RIFF' || String.fromCharCode(...bytes.slice(8, 12)) !== 'WEBP') return null

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const type = String.fromCharCode(...bytes.slice(12, 16))
  if (type === 'VP8X') {
    return { width: 1 + view.getUint8(24) + (view.getUint8(25) << 8) + (view.getUint8(26) << 16), height: 1 + view.getUint8(27) + (view.getUint8(28) << 8) + (view.getUint8(29) << 16) }
  }
  if (type === 'VP8L') {
    const bits = view.getUint32(21, true)
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
  }
  if (type === 'VP8 ') {
    return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff }
  }
  return null
}

export async function validateCenterLogo(file: File) {
  if (!(file.type in MIME_TO_EXTENSION)) {
    throw new Error('El logo ha de ser un fitxer PNG, JPG/JPEG o WebP')
  }
  if (file.size === 0 || file.size > MAX_LOGO_SIZE_BYTES) {
    throw new Error('El logo ha de pesar com a màxim 2 MB')
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const dimensions = file.type === 'image/png'
    ? readPngDimensions(bytes)
    : file.type === 'image/jpeg'
      ? readJpegDimensions(bytes)
      : readWebpDimensions(bytes)

  if (!dimensions || dimensions.width < MIN_LOGO_DIMENSION || dimensions.height < MIN_LOGO_DIMENSION) {
    throw new Error('El logo ha de tenir com a mínim 256 × 256 píxels')
  }

  return { extension: MIME_TO_EXTENSION[file.type], dimensions }
}

export const centerLogoConstraints = {
  maxSizeBytes: MAX_LOGO_SIZE_BYTES,
  minDimension: MIN_LOGO_DIMENSION,
  acceptedTypes: Object.keys(MIME_TO_EXTENSION),
}

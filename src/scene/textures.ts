import * as THREE from 'three'

/** Soft radial glow for additive sprites. */
export function glowTexture(rgb: string) {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const x = c.getContext('2d')!
  const g = x.createRadialGradient(128, 128, 8, 128, 128, 128)
  g.addColorStop(0, `rgba(${rgb},1)`)
  g.addColorStop(0.35, `rgba(${rgb},.42)`)
  g.addColorStop(1, `rgba(${rgb},0)`)
  x.fillStyle = g
  x.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(c)
}

/** Amber rings for the wound film inside the reel (Blender used a procedural wave texture, which glTF can't carry). */
export function packTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const x = c.getContext('2d')!
  x.fillStyle = '#1A0C05'
  x.fillRect(0, 0, 512, 512)
  for (let r = 60; r < 256; r += 1.6) {
    const a = 0.18 + 0.25 * Math.abs(Math.sin(r * 0.37))
    x.strokeStyle = `rgba(214,120,48,${a.toFixed(3)})`
    x.lineWidth = 1
    x.beginPath()
    x.arc(256, 256, r, 0, Math.PI * 2)
    x.stroke()
  }
  x.fillStyle = '#0E0603'
  x.beginPath()
  x.arc(256, 256, 58, 0, Math.PI * 2)
  x.fill()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

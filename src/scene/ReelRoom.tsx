import { useMemo, useRef } from 'react'
import { useFrame, type RootState, type ThreeEvent } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import {
  ATLAS_W, CELL_W, CELLS, FRAME_LEN, GATE_U, LEAD, PACK_R, REP, SHOW_U,
  feedToShow, filmAtUv, filmU, stripCurve,
} from '../data/strip'
import { useReel, type Phase } from '../state/useReel'
import { glowTexture, packTexture } from './textures'

const MODEL_URL = '/models/reel-room.glb'
const ATLAS_URL = '/textures/film-atlas.png'

const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const SPEED = reducedMotion ? 0.25 : 1
const T = { roll: 2.9 * SPEED, focus: 1.1 * SPEED, feed: 2.7 * SPEED, lead: 1.9 * SPEED, ret: 2.0 * SPEED }

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const clamp01 = (t: number) => Math.max(0, Math.min(1, t))

type Parts = {
  spin: THREE.Object3D
  strip: THREE.Mesh
  atlas: THREE.Texture
  screenMat: THREE.MeshBasicMaterial
  extras: THREE.Group
  beam: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>
  lamp: THREE.SpotLight
  lensGlow: THREE.Sprite
  halo: THREE.Sprite
  reelGlow: THREE.Sprite
  frameGlow: THREE.Sprite
}

function glow(tex: THREE.Texture, size: number, opacity: number) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }))
  s.scale.set(size, size, 1)
  return s
}

/** Swap in the web materials and add the pieces glTF can't carry (wound film, beam, glows). */
function buildParts(model: THREE.Group, atlas: THREE.Texture): Parts {
  // useGLTF caches the scene and StrictMode runs memos twice: build once, or the materials we
  // animate wouldn't be the ones on the meshes
  if (model.userData.parts) return model.userData.parts as Parts
  atlas.colorSpace = THREE.SRGBColorSpace
  atlas.flipY = false // glTF UVs are top-down
  atlas.wrapS = THREE.RepeatWrapping
  atlas.repeat.set(REP, 1)
  atlas.anisotropy = 8
  atlas.needsUpdate = true

  model.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined
    if (m && m.isMeshStandardMaterial) m.envMapIntensity = 1.1
  })
  // Blender's lacquer floor mirrors every point light into hot spots once bloom is on; keep it a soft satin instead
  const floor = model.getObjectByName('Floor') as THREE.Mesh | undefined
  if (floor) {
    const fm = floor.material as THREE.MeshStandardMaterial
    fm.roughness = 0.78
    fm.metalness = 0
    fm.envMapIntensity = 0.25
  }

  const spin = model.getObjectByName('Reel_Spin')!
  const strip = model.getObjectByName('Film_Strip') as THREE.Mesh
  strip.material = new THREE.MeshBasicMaterial({
    map: atlas, transparent: true, opacity: 0.94, side: THREE.DoubleSide, depthWrite: false, alphaTest: 0.03,
  })

  if (!spin.getObjectByName('Reel_WoundFilm')) {
    const cap = new THREE.MeshStandardMaterial({ map: packTexture(), emissive: 0x6a2c0c, emissiveIntensity: 0.6, roughness: 0.6 })
    const side = new THREE.MeshStandardMaterial({ color: 0x3a1b0b, emissive: 0x5a2208, emissiveIntensity: 0.5, roughness: 0.5 })
    const pack = new THREE.Mesh(new THREE.CylinderGeometry(PACK_R, PACK_R, 0.94, 96), [side, cap, cap])
    pack.name = 'Reel_WoundFilm'
    pack.rotation.x = Math.PI / 2
    spin.add(pack)
  }

  // the screen shows the chosen frame, cropped out of the same atlas
  const screen = model.getObjectByName('Screen') as THREE.Mesh
  const crop = atlas.clone()
  crop.wrapS = crop.wrapT = THREE.ClampToEdgeWrapping
  crop.repeat.set(2.28 / ATLAS_W, 0.64)
  crop.offset.set((LEAD * CELL_W + 0.14) / ATLAS_W, 0.16)
  crop.needsUpdate = true
  // toneMapped off so the projection can glow past white and catch the bloom
  const screenMat = new THREE.MeshBasicMaterial({ map: crop, color: 0x2a1a10, toneMapped: false })
  screen.material = screenMat

  model.updateMatrixWorld(true)
  const lensPos = new THREE.Vector3()
  model.getObjectByName('Projector_LensGlass')!.getWorldPosition(lensPos)
  lensPos.x += 0.05

  // beam: four thin triangles from the lens to the screen's corners
  const pos = screen.geometry.attributes.position
  const corners: THREE.Vector3[] = []
  for (let k = 0; k < pos.count; k++) corners.push(new THREE.Vector3().fromBufferAttribute(pos, k).applyMatrix4(screen.matrixWorld))
  const centre = corners.reduce((a, c) => a.add(c), new THREE.Vector3()).multiplyScalar(1 / corners.length)
  corners.sort((a, b) => b.y - a.y)
  const rim = [...corners.slice(0, 2).sort((a, b) => a.x - b.x), ...corners.slice(2).sort((a, b) => b.x - a.x)]
  const tris: number[] = []
  rim.forEach((a, k) => {
    const b = rim[(k + 1) % rim.length]
    tris.push(lensPos.x, lensPos.y, lensPos.z, a.x, a.y, a.z, b.x, b.y, b.z)
  })
  const beamGeo = new THREE.BufferGeometry()
  beamGeo.setAttribute('position', new THREE.Float32BufferAttribute(tris, 3))
  const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({
    color: 0xffc98a, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
  }))

  const lamp = new THREE.SpotLight(0xffd49a, 1, 30, 0.42, 0.6, 0)
  lamp.position.copy(lensPos)
  lamp.target.position.copy(centre)

  const amber = glowTexture('255,160,70')
  const lensGlow = glow(glowTexture('255,226,180'), 2.4, 0.35)
  lensGlow.position.copy(lensPos)
  const halo = glow(amber, 14, 0.05)
  halo.position.copy(centre).add(new THREE.Vector3(0.4, 0, -0.6))
  const reelPos = new THREE.Vector3()
  spin.getWorldPosition(reelPos)
  const reelGlow = glow(amber, 9, 0.22)
  reelGlow.position.set(reelPos.x, reelPos.y, reelPos.z - 1.4)
  const frameGlow = glow(amber, 3.6, 0)

  const extras = new THREE.Group()
  extras.add(beam, lamp, lamp.target, lensGlow, halo, reelGlow, frameGlow)
  const parts: Parts = { spin, strip, atlas, screenMat, extras, beam, lamp, lensGlow, halo, reelGlow, frameGlow }
  model.userData.parts = parts
  return parts
}

type Shot = { p: THREE.Vector3; l: THREE.Vector3 }
const shot = (): Shot => ({ p: new THREE.Vector3(), l: new THREE.Vector3() })

function overviewShot(cam: THREE.PerspectiveCamera, out: Shot) {
  const hf = 2 * Math.atan(Math.tan((cam.fov * Math.PI) / 360) * cam.aspect)
  // frame the reel → screen run (about x -10…18), lifted so it sits under the search panel
  out.p.set(5, 4.8, Math.max(22, 15.5 / Math.tan(hf / 2)))
  out.l.set(5, 1.5, 0)
  return out
}
function screenShot(cam: THREE.PerspectiveCamera, out: Shot) {
  // the whole screen plus the lens at the left edge; back off on narrow windows
  const k = Math.max(1, (16 / 9) / cam.aspect)
  out.l.set(15.2, 0.85, -1.8)
  out.p.set(12.2, 1.5, 8.4).sub(out.l).multiplyScalar(k).add(out.l)
  return out
}
function followShot(u: number, out: Shot) {
  // sit back and a little to the right, so the reel flange doesn't crowd the frame
  const p = stripCurve.getPointAt(clamp01(u))
  out.p.set(p.x + 1.6, p.y + 0.9, p.z + 5.6)
  out.l.set(p.x + 0.5, p.y + 0.1, p.z)
  return out
}

function initialState() {
  return {
    phase: 'loading' as Phase, t0: 0, target: -1, playT: 0, lastCommand: 0,
    feed: 0.02, feedFrom: 0, feedTo: 0,
    cam: shot(), from: shot(), tmp: shot(), over: shot(), scr: shot(),
  }
}
type Sim = ReturnType<typeof initialState>

function step(state: RootState, dt: number, parts: Parts, s: Sim) {
  const now = state.clock.elapsedTime
  const camera = state.camera as THREE.PerspectiveCamera
  const store = useReel.getState()
  overviewShot(camera, s.over)
  screenShot(camera, s.scr)

  const go = (phase: Phase) => {
    s.phase = phase
    s.t0 = now
    s.from.p.copy(s.cam.p)
    s.from.l.copy(s.cam.l)
    store.reportPhase(phase, s.target >= 0 ? s.target : undefined)
  }
  const lerpCam = (to: Shot, k: number) => {
    s.cam.p.lerpVectors(s.from.p, to.p, k)
    s.cam.l.lerpVectors(s.from.l, to.l, k)
  }

  if (s.phase === 'loading') {
    s.cam.p.copy(s.over.p)
    s.cam.l.copy(s.over.l)
    go('idle')
  }

  // commands from the UI
  const cmd = store.command
  if (cmd && cmd.id !== s.lastCommand) {
    s.lastCommand = cmd.id
    if (cmd.kind === 'goto' && (s.phase === 'idle' || s.phase === 'play')) {
      s.target = cmd.film
      s.playT = 0
      parts.screenMat.map!.offset.x = ((LEAD + cmd.film) * CELL_W + 0.14) / ATLAS_W
      s.feedFrom = s.feed
      s.feedTo = feedToShow(cmd.film, s.feed)
      go('roll')
    } else if (cmd.kind === 'back' && s.phase === 'play') {
      go('return')
    }
  }

  const el = now - s.t0
  const prevFeed = s.feed
  switch (s.phase) {
    case 'idle':
      if (!reducedMotion) s.feed -= dt * 0.0035
      s.cam.p.copy(s.over.p)
      s.cam.l.copy(s.over.l)
      break
    case 'roll': {
      // the reel rolls, the film slides, the camera pans along the strip to where the film stops
      const e = ease(clamp01(el / T.roll))
      s.feed = s.feedFrom + (s.feedTo - s.feedFrom) * e
      followShot(SHOW_U, s.tmp)
      s.tmp.p.y += 0.8 * (1 - e)
      s.tmp.p.z += 2.4 * (1 - e)
      lerpCam(s.tmp, ease(clamp01(el / (T.roll * 0.9))))
      if (el >= T.roll) go('focus')
      break
    }
    case 'focus':
      followShot(SHOW_U, s.tmp)
      s.tmp.p.y -= 0.2
      s.tmp.p.z -= 1.4
      lerpCam(s.tmp, ease(clamp01(el / T.focus)))
      if (el >= T.focus) {
        s.feedFrom = s.feed
        s.feedTo = s.feed - (GATE_U - SHOW_U) * REP
        go('feed')
      }
      break
    case 'feed': {
      // the frame rides through the twist into the projector; the camera follows it
      const e = ease(clamp01(el / T.feed))
      s.feed = s.feedFrom + (s.feedTo - s.feedFrom) * e
      // the feed is already eased, so ride with the frame exactly; only blend in from the focus pose
      followShot(Math.min(filmU(s.target, s.feed), 0.99), s.tmp)
      lerpCam(s.tmp, ease(clamp01(el / 0.5)))
      if (el >= T.feed) go('lead')
      break
    }
    case 'lead': {
      // arc up and back over the projector instead of flying through it
      const e = ease(clamp01(el / T.lead))
      lerpCam(s.scr, e)
      s.cam.p.y += Math.sin(Math.PI * e) * 2.2
      s.cam.p.z += Math.sin(Math.PI * e) * 4.5
      if (el >= T.lead) go('play')
      break
    }
    case 'play':
      s.cam.p.copy(s.scr.p)
      s.cam.l.copy(s.scr.l)
      if (!store.paused) {
        s.playT += dt
        s.feed -= dt * 0.045
      }
      break
    case 'return':
      lerpCam(s.over, ease(clamp01(el / T.ret)))
      if (el >= T.ret) go('idle')
      break
  }

  // the reel turns with the film it pays out
  parts.spin.rotation.z += ((prevFeed - s.feed) * CELLS * FRAME_LEN) / PACK_R
  parts.atlas.offset.x = s.feed

  // glow on the chosen frame wherever it is on the strip
  const glowOn = (s.phase === 'focus' || s.phase === 'feed') && s.target >= 0
  if (s.target >= 0) {
    const u = filmU(s.target, s.feed)
    if (u <= 1) parts.frameGlow.position.copy(stripCurve.getPointAt(u)).add(new THREE.Vector3(0, 0, -0.3))
  }
  const fg = parts.frameGlow.material
  fg.opacity += ((glowOn ? 0.9 : 0) - fg.opacity) * Math.min(1, dt * 5)

  // projector: lamp, beam and screen come up as the camera arrives
  const running = s.phase === 'play' && !store.paused
  const lit = s.phase === 'play' ? 1 : s.phase === 'lead' ? ease(clamp01(el / T.lead)) : 0
  const flick = running ? 0.86 + Math.random() * 0.14 : 1
  parts.screenMat.color.setRGB(0.12 + 2.1 * lit * flick, 0.08 + 1.45 * lit * flick, 0.05 + 0.75 * lit * flick)
  parts.beam.material.opacity = 0.06 * lit * flick
  parts.lamp.intensity = 1.2 + 7 * lit * flick
  parts.lensGlow.material.opacity = 0.35 + 0.6 * lit * flick
  parts.halo.material.opacity = 0.05 + 0.12 * lit * flick
  parts.reelGlow.material.opacity = 0.2 + Math.sin(now * 0.8) * 0.04

  camera.position.copy(s.cam.p)
  camera.lookAt(s.cam.l)
}

export function ReelRoom() {
  const { scene: model } = useGLTF(MODEL_URL)
  const source = useTexture(ATLAS_URL)
  const parts = useMemo(() => buildParts(model, source), [model, source])
  const sim = useRef<Sim>(initialState())

  useFrame((state, delta) => step(state, Math.min(delta, 0.05), parts, sim.current))

  const filmUnder = (e: ThreeEvent<PointerEvent | MouseEvent>) =>
    sim.current.phase === 'idle' && e.object === parts.strip && e.uv ? filmAtUv(e.uv.x, sim.current.feed) : null

  return (
    <>
      <primitive
        object={model}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => { document.body.style.cursor = filmUnder(e) !== null ? 'pointer' : 'default' }}
        onPointerOut={() => { document.body.style.cursor = 'default' }}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          const film = filmUnder(e)
          if (film !== null) {
            e.stopPropagation()
            useReel.getState().goTo(film)
          }
        }}
      />
      <primitive object={parts.extras} />
    </>
  )
}

useGLTF.preload(MODEL_URL)
useTexture.preload(ATLAS_URL)

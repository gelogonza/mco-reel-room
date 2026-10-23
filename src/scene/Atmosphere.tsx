import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'

const BG = '#0C0705'

/** Small seeded PRNG (mulberry32) so the dust is the same on every render. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Dust drifting through the room, thicker in the projector beam. */
function Dust({ count = 520 }) {
  const ref = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const rand = seeded(1990)
    const a = new Float32Array(count * 3)
    for (let k = 0; k < count; k++) {
      const inBeam = k % 3 === 0
      a[k * 3] = inBeam ? 11 + rand() * 4.5 : -11 + rand() * 29
      a[k * 3 + 1] = (rand() - 0.5) * 7
      a[k * 3 + 2] = (rand() - 0.5) * (inBeam ? 2 : 9)
    }
    return a
  }, [count])
  useFrame((_, delta) => {
    const attr = ref.current?.geometry.attributes.position
    if (!attr) return
    const arr = attr.array as Float32Array
    for (let k = 0; k < count; k++) {
      let y = arr[k * 3 + 1] + Math.min(delta, 0.05) * 0.07
      if (y > 3.5) y = -3.5
      arr[k * 3 + 1] = y
    }
    attr.needsUpdate = true
  })
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#ffd39a" size={0.035} transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

/** Background, fog, warm lights and a warm reflection environment for the copper reel. */
export function Atmosphere() {
  return (
    <>
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 22, 60]} />
      <ambientLight color="#ffd7a8" intensity={0.6} />
      <pointLight color="#ffb26b" intensity={4.5} distance={60} decay={0} position={[-3, 7, 9]} />
      <pointLight color="#ff4f5e" intensity={4.5} distance={30} decay={0} position={[-10, 3, -3]} />
      <pointLight color="#ff9a40" intensity={3.2} distance={30} decay={0} position={[0, 1.5, -4]} />
      <pointLight color="#ff9a40" intensity={1.2} distance={9} decay={0} position={[-7.2, 3.8, 3.2]} />
      <Environment resolution={256} frames={1} environmentIntensity={0.9}>
        <color attach="background" args={['#140a06']} />
        <Lightformer form="rect" intensity={3} color="#ffb26b" position={[0, 12, 0]} rotation-x={Math.PI / 2} scale={[18, 9, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#ff7a3c" position={[-14, 3, 6]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={2} color="#ffd49a" position={[14, 4, -4]} rotation-y={-Math.PI / 2} scale={[10, 5, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#5a2a14" position={[0, -4, 14]} scale={[20, 10, 1]} />
      </Environment>
      <Dust />
    </>
  )
}

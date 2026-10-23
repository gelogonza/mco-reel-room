import { Component, Suspense, useState, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { Atmosphere } from './scene/Atmosphere'
import { ReelRoom } from './scene/ReelRoom'
import { Overlay } from './ui/Overlay'

class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export default function App() {
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="app">
      <Canvas
        className="stage"
        dpr={[1, 2]}
        camera={{ fov: 40, near: 0.1, far: 150, position: [4.6, 4.2, 27.5] }}
        gl={{ antialias: true }}
        fallback={<p className="fallback">This needs WebGL, which this browser has turned off.</p>}
        aria-label="An upright film reel paying out a twisting amber film strip into a projector. Search or click a frame to project it."
      >
        <SceneBoundary onError={() => setError('THE 3D MODEL DIDN’T LOAD · RELOAD TO TRY AGAIN')}>
          <Suspense fallback={null}>
            <Atmosphere />
            <ReelRoom />
          </Suspense>
        </SceneBoundary>
        <EffectComposer>
          <Bloom mipmapBlur intensity={0.7} luminanceThreshold={0.78} luminanceSmoothing={0.15} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      </Canvas>
      <Overlay error={error} />
    </div>
  )
}

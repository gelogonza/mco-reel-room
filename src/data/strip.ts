import * as THREE from 'three'

// Constants shared with the Blender scene (~/Documents/MCO Reel Room/mco-reel-room.blend).
// Change them together: the atlas layout, strip length and reel size all depend on each other.
export const CELLS = 16 // frames in film-atlas.png: 2 leader, 12 films, 2 tail
export const LEAD = 2
export const FRAME_LEN = 1.22 // world length of one frame along the strip
export const PACK_R = 1.85 // radius of the wound film on the reel
export const REP = 0.8501040314408157 // share of the atlas the visible strip shows (strip length / (CELLS * FRAME_LEN))
export const ATLAS_W = 40.96 // atlas width in Blender units (CELLS * 2.56)
export const CELL_W = 2.56

export const SHOW_U = 0.19 // where a found frame stops: the flat run before the twist
export const GATE_U = 0.985 // the projector gate

// Strip centre line exported from Blender, in glTF (Y-up) coordinates.
const STRIP_PTS: [number, number, number][] = [[-7.2,-0.25,0],[-7.017,-0.269,0.014],[-6.834,-0.289,0.023],[-6.651,-0.311,0.029],[-6.468,-0.333,0.036],[-6.285,-0.353,0.046],[-6.102,-0.37,0.062],[-5.92,-0.385,0.085],[-5.739,-0.395,0.118],[-5.56,-0.401,0.16],[-5.382,-0.408,0.211],[-5.207,-0.417,0.268],[-5.034,-0.426,0.33],[-4.861,-0.434,0.395],[-4.69,-0.439,0.462],[-4.519,-0.441,0.531],[-4.348,-0.439,0.601],[-4.178,-0.432,0.671],[-4.008,-0.418,0.74],[-3.838,-0.397,0.809],[-3.668,-0.366,0.874],[-3.501,-0.323,0.938],[-3.338,-0.267,1.004],[-3.18,-0.2,1.072],[-3.026,-0.125,1.14],[-2.875,-0.045,1.208],[-2.724,0.039,1.274],[-2.574,0.125,1.338],[-2.423,0.212,1.398],[-2.269,0.297,1.455],[-2.112,0.378,1.506],[-1.95,0.454,1.55],[-1.783,0.521,1.586],[-1.609,0.579,1.612],[-1.434,0.635,1.63],[-1.258,0.688,1.641],[-1.081,0.739,1.645],[-0.903,0.787,1.642],[-0.724,0.83,1.635],[-0.544,0.868,1.623],[-0.363,0.901,1.606],[-0.182,0.926,1.585],[0,0.944,1.562],[0.182,0.953,1.535],[0.364,0.951,1.506],[0.545,0.938,1.473],[0.724,0.913,1.435],[0.899,0.876,1.391],[1.072,0.832,1.343],[1.242,0.782,1.293],[1.41,0.726,1.241],[1.576,0.668,1.188],[1.742,0.608,1.134],[1.908,0.548,1.08],[2.074,0.488,1.027],[2.241,0.431,0.975],[2.41,0.377,0.925],[2.581,0.326,0.878],[2.751,0.273,0.83],[2.92,0.216,0.783],[3.088,0.157,0.736],[3.256,0.098,0.689],[3.425,0.039,0.642],[3.594,-0.019,0.596],[3.764,-0.074,0.551],[3.935,-0.125,0.506],[4.109,-0.17,0.462],[4.284,-0.208,0.42],[4.462,-0.236,0.38],[4.641,-0.253,0.342],[4.822,-0.256,0.305],[5.003,-0.246,0.271],[5.183,-0.227,0.239],[5.363,-0.199,0.208],[5.542,-0.165,0.18],[5.72,-0.127,0.153],[5.899,-0.087,0.129],[6.077,-0.047,0.106],[6.256,-0.009,0.085],[6.437,0.025,0.066],[6.618,0.052,0.048],[6.8,0.075,0.034],[6.983,0.097,0.024],[7.166,0.117,0.017],[7.35,0.137,0.012],[7.533,0.156,0.009],[7.716,0.175,0.008],[7.9,0.193,0.007],[8.083,0.212,0.006],[8.267,0.231,0.004],[8.45,0.25,0]]

export const stripCurve = new THREE.CatmullRomCurve3(
  STRIP_PTS.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
  false,
  'centripetal',
)

const mod1 = (x: number) => ((x % 1) + 1) % 1
const cellCentre = (film: number) => (LEAD + film + 0.5) / CELLS

/** Atlas coordinate = u * REP + feed, so a film sits where that equals its cell centre. May be > 1 (still on the reel or past the gate). */
export const filmU = (film: number, feed: number) => mod1(cellCentre(film) - feed) / REP

/** The feed value that brings `film` to SHOW_U, always further along than `feed` so the reel only ever rolls forward. */
export function feedToShow(film: number, feed: number) {
  const want = cellCentre(film) - SHOW_U * REP
  return want + Math.floor(feed - 0.12 - want)
}

/** Which film (if any) is at a point on the strip, given its UV.x. */
export function filmAtUv(u: number, feed: number): number | null {
  const k = Math.floor(mod1(u * REP + feed) * CELLS) - LEAD
  return k >= 0 && k < 12 ? k : null
}

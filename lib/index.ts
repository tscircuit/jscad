import { withReferences } from "./with-references"
const jscad = withReferences()
export default jscad
export const {
  booleans,
  colors,
  curves,
  expansions,
  extrusions,
  geometries,
  hulls,
  maths,
  measurements,
  modifiers,
  primitives,
  text,
  transforms,
  utils,
  references,
} = jscad
export { withReferences }
export type {
  CompatibleJscad,
  ExtrudeLinearOptions,
  NativeGeometry,
  NativeProfile,
  NativeReference,
  OutlineNames,
  ReferenceApi,
} from "./types"

export { geom3ToIndexedMesh, type IndexedMesh } from "./geom3-to-indexed-mesh"

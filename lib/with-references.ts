import { cleanupSubtraction } from "./cleanup-subtraction"
import modeling from "@jscad/modeling"
import type {
  CompatibleJscad,
  NativeGeometry,
  NativeReference,
  ReferenceApi,
} from "./types"

const metadata = Symbol.for("@tscircuit/jscad/references/v1")
type Refs = Record<string, NativeReference>
const cache = new WeakMap<object, CompatibleJscad>()
const snapshot = <T>(value: T): T => structuredClone(value)
const assertName = (name: string) => {
  if (typeof name !== "string" || !name.trim())
    throw new Error("Reference name must be nonempty")
}

/** Wrap a supplied kernel without changing its modules or native geometry format. */
export function withReferences(
  kernel: typeof modeling = modeling,
): CompatibleJscad {
  if (cache.has(kernel)) return cache.get(kernel)!
  const k = kernel as any
  const { mat4 } = k.maths
  const identity = () => Array.from(mat4.create()) as number[]
  const multiply = (a: number[], b: number[]) =>
    Array.from(mat4.multiply(mat4.create(), a, b)) as number[]
  const isGeometry = (g: any) =>
    g &&
    (k.geometries.geom2.isA(g) ||
      k.geometries.path2.isA(g) ||
      k.geometries.geom3.isA(g))
  const inputs = (args: any[]): any[] => args.flat(Infinity).filter(isGeometry)
  const read = (g: any): Refs => g?.[metadata] ?? Object.create(null)
  const merge = (geometries: any[]): Refs => {
    const refs: Refs = Object.create(null)
    for (const g of geometries)
      for (const [name, ref] of Object.entries(read(g))) {
        if (Object.hasOwn(refs, name) && refs[name] !== ref)
          throw new Error(`Duplicate reference: ${name}`)
        refs[name] = ref
      }
    return refs
  }
  const attach = (g: any, refs: Refs): any => {
    if (!Object.keys(refs).length) return g
    if (Array.isArray(g)) return g.map((item) => attach(item, refs))
    return isGeometry(g) ? Object.assign({}, g, { [metadata]: refs }) : g
  }
  const moved = (refs: Refs, matrix: number[]): Refs =>
    Object.fromEntries(
      Object.entries(refs).map(([name, ref]) => [
        name,
        { geometry: ref.geometry, matrix: multiply(matrix, ref.matrix) },
      ]),
    )
  const add = (refs: Refs, name: string, ref: NativeReference) => {
    assertName(name)
    if (Object.hasOwn(refs, name))
      throw new Error(`Duplicate reference: ${name}`)
    refs[name] = ref
  }
  const planar = (g: any) => {
    if (!k.geometries.geom2.isA(g) && !k.geometries.path2.isA(g))
      throw new Error("References require native planar geometry")
  }
  const references: ReferenceApi = {
    name(name, geometry) {
      planar(geometry)
      const refs = merge([geometry])
      add(refs, name, { geometry: snapshot(geometry), matrix: identity() })
      return attach(geometry, refs)
    },
    nameOutlines(geometry, names) {
      if (!k.geometries.geom2.isA(geometry))
        throw new Error("nameOutlines requires a native Geom2")
      const refs = merge([geometry])
      const outlines: number[][][] = k.geometries.geom2.toOutlines(
        snapshot(geometry),
      )
      const area = (points: number[][]) =>
        points.reduce((sum, p, i) => {
          const q = points[(i + 1) % points.length]!
          return sum + p[0]! * q[1]! - p[1]! * q[0]!
        }, 0)
      for (const [role, name] of Object.entries(names)) {
        if (name === undefined) continue
        if (role !== "outer" && role !== "hole")
          throw new Error(`Unknown outline role: ${role}`)
        const matches = outlines.filter((points) =>
          role === "outer" ? area(points) > 0 : area(points) < 0,
        )
        if (matches.length !== 1)
          throw new Error(
            `Expected exactly one ${role} outline, found ${matches.length}`,
          )
        add(refs, name, {
          geometry: k.geometries.path2.fromPoints({ closed: true }, matches[0]),
          matrix: identity(),
        })
      }
      return attach(geometry, refs)
    },
    reference(name, geometry) {
      return attach(
        k.geometries.geom3.create(),
        read(references.name(name, geometry)),
      )
    },
    get(geometry, name) {
      const ref = read(geometry)[name]
      if (!Object.hasOwn(read(geometry), name))
        throw new Error(`Unknown reference: ${name}`)
      return snapshot(ref!)
    },
    list(geometry) {
      return Object.keys(read(geometry))
    },
    collect(geometries) {
      return snapshot(merge(inputs([geometries])))
    },
  }
  const wrapped: any = { ...k, references }
  // Shape-producing operations carry authored construction references from every
  // operand, including boolean cutters. They do not assert surviving B-rep edges.
  for (const namespace of [
    "booleans",
    "hulls",
    "expansions",
    "modifiers",
    "extrusions",
    "colors",
  ]) {
    wrapped[namespace] = { ...k[namespace] }
    for (const [name, fn] of Object.entries(k[namespace]))
      if (typeof fn === "function") {
        wrapped[namespace][name] = (...args: any[]) => {
          const refs = merge(inputs(args))
          let result = (fn as Function)(...args)
          if (
            namespace === "booleans" &&
            name === "subtract" &&
            k.geometries.geom3.isA(result)
          ) {
            result = cleanupSubtraction(kernel, result)
          }
          return attach(result, refs)
        }
      }
  }
  const transformResult = (
    fn: Function,
    args: any[],
    offset: number,
    boundsBased = false,
  ) => {
    const gs = inputs(args.slice(offset))
    if (!gs.some((g) => Object.keys(read(g)).length)) return fn(...args)
    const maps = gs.map((g) => read(g))
    const before = boundsBased
      ? gs.map((g) => k.measurements.measureBoundingBox(snapshot(g))[0])
      : []
    const matrix = boundsBased
      ? null
      : fn(...args.slice(0, offset), k.geometries.geom3.create()).transforms
    const result = fn(...args)
    const results = Array.isArray(result) ? result : [result]
    const output = results.map((g: any, i: number) => {
      let m = matrix
      if (boundsBased) {
        const after = k.measurements.measureBoundingBox(snapshot(g))[0]
        m = mat4.fromTranslation(
          mat4.create(),
          after.map((n: number, axis: number) => n - before[i][axis]),
        )
      }
      return attach(g, moved(maps[i]!, Array.from(m)))
    })
    return Array.isArray(result) ? output : output[0]
  }
  wrapped.transforms = { ...k.transforms }
  for (const [name, fn] of Object.entries(k.transforms)) {
    const boundsBased = /^(center|align)/.test(name)
    const offset = /^center[XYZ]$|^mirror[XYZ]$/.test(name) ? 0 : 1
    wrapped.transforms[name] = (...args: any[]) =>
      transformResult(fn as Function, args, offset, boundsBased)
  }
  wrapped.geometries = { ...k.geometries }
  for (const ns of ["geom2", "geom3", "path2"]) {
    wrapped.geometries[ns] = {
      ...k.geometries[ns],
      transform: (matrix: number[], g: any) =>
        attach(k.geometries[ns].transform(matrix, g), moved(read(g), matrix)),
    }
  }
  wrapped.extrusions.extrudeLinear = (options: any, ...objects: any[]) => {
    const gs = inputs(objects)
    const { topOutlineName, bottomOutlineName } = options ?? {}
    if (topOutlineName === undefined && bottomOutlineName === undefined) {
      const refs = gs.map(read)
      const result = k.extrusions.extrudeLinear(options, ...objects)
      return Array.isArray(result)
        ? result.map((g: any, i: number) => attach(g, refs[i]!))
        : attach(result, refs[0] ?? {})
    }
    if (gs.length !== 1)
      throw new Error("Named extrusion outlines require exactly one profile")
    const profile = gs[0]
    planar(profile)
    if (k.geometries.path2.isA(profile) && !profile.isClosed)
      throw new Error("Named extrusion outlines require a closed path")
    const { height = 1, twistAngle = 0, twistSteps = 1 } = options
    if (
      !Number.isFinite(height) ||
      !Number.isFinite(twistAngle) ||
      !Number.isInteger(twistSteps) ||
      twistSteps < 1
    )
      throw new Error(
        "Invalid named extrusion height, twistAngle or twistSteps",
      )
    const refs = merge(gs)
    const source = snapshot(profile)
    const top = multiply(
      Array.from(mat4.fromTranslation(mat4.create(), [0, 0, height])),
      Array.from(mat4.fromZRotation(mat4.create(), twistAngle)),
    )
    for (const [prefix, matrix] of [
      [bottomOutlineName, identity()],
      [topOutlineName, top],
    ] as const) {
      if (prefix === undefined) continue
      add(refs, prefix, { geometry: source, matrix })
      for (const [name, ref] of Object.entries(read(profile)))
        add(refs, `${prefix}.${name}`, {
          geometry: ref.geometry,
          matrix: multiply(matrix, ref.matrix),
        })
    }
    return attach(k.extrusions.extrudeLinear(options, ...objects), refs)
  }
  cache.set(kernel, wrapped)
  cache.set(wrapped, wrapped)
  return wrapped
}

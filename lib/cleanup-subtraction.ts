/// <reference path="./upstream-modifiers.d.ts" />
import insertTjunctions from "@jscad/modeling/src/operations/modifiers/insertTjunctions.js"
import earcut from "@jscad/modeling/src/operations/extrusions/earcut/index.js"
import type modeling from "@jscad/modeling"

type Point3 = [number, number, number]

const planarProjection = (vertices: Point3[]) => {
  const normal: Point3 = [0, 0, 0]
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i]!
    const b = vertices[(i + 1) % vertices.length]!
    normal[0] += (a[1] - b[1]) * (a[2] + b[2])
    normal[1] += (a[2] - b[2]) * (a[0] + b[0])
    normal[2] += (a[0] - b[0]) * (a[1] + b[1])
  }
  const dominant = normal.reduce(
    (best, value, axis) =>
      Math.abs(value) > Math.abs(normal[best]!) ? axis : best,
    0,
  )
  const axes = [0, 1, 2].filter((axis) => axis !== dominant)
  const flat = vertices.flatMap((point) => [point[axes[0]!]!, point[axes[1]!]!])
  const extent = Math.max(1, ...flat.map((value) => Math.abs(value)))
  return { normal, flat, extent }
}

const convexPlanarPolygon = (vertices: Point3[], epsilon: number) => {
  const { flat, extent } = planarProjection(vertices)
  const tolerance = Math.max(epsilon * extent, 1e-12) * extent
  let positive = false
  let negative = false
  for (let i = 0; i < vertices.length; i++) {
    const ax = flat[i * 2]!
    const ay = flat[i * 2 + 1]!
    const bx = flat[((i + 1) % vertices.length) * 2]!
    const by = flat[((i + 1) % vertices.length) * 2 + 1]!
    const cx = flat[((i + 2) % vertices.length) * 2]!
    const cy = flat[((i + 2) % vertices.length) * 2 + 1]!
    const cross = (bx - ax) * (cy - by) - (by - ay) * (cx - bx)
    if (cross > tolerance) positive = true
    if (cross < -tolerance) negative = true
  }
  return !(positive && negative)
}

/** Normalize floating-point boolean joins before native triangulation. */
export function cleanupSubtraction(
  kernel: typeof modeling,
  geometry: modeling.geometries.geom3.Geom3,
) {
  const { geom3 } = kernel.geometries
  if (!geometry.polygons.length) return geometry
  const source = structuredClone(geometry)
  const polygons = geom3.toPolygons(source)
  const extent = Math.max(...kernel.measurements.measureDimensions(source))
  if (!Number.isFinite(extent) || extent <= 0)
    throw new Error("Subtraction requires finite nonempty geometry")
  const epsilon = Math.max(extent * 1e-10, 1e-12)
  source.polygons = polygons.map((polygon) => ({
    ...polygon,
    vertices: polygon.vertices.map((point) => {
      if (!point.every(Number.isFinite))
        throw new Error("Subtraction requires finite coordinates")
      return point.map((value) => Math.round(value / epsilon) * epsilon) as [
        number,
        number,
        number,
      ]
    }),
  }))
  // Reuse the pinned kernel's boundary insertion, but do not snap generated
  // centroids: upstream generalize can move those points off the source plane.
  const triangles = insertTjunctions(source.polygons).flatMap((polygon) => {
    if (polygon.vertices.length === 3) return [polygon]
    const makeTriangle = (points: Point3[]) => {
      const triangle = kernel.geometries.poly3.create(points)
      if (polygon.color) triangle.color = polygon.color
      return triangle
    }
    const centerFan = () => {
      const center: Point3 = [0, 0, 0]
      for (const point of polygon.vertices)
        for (let axis = 0; axis < 3; axis++)
          center[axis]! += point[axis]! / polygon.vertices.length
      return polygon.vertices.map((point, index) =>
        makeTriangle([
          center,
          point as Point3,
          polygon.vertices[(index + 1) % polygon.vertices.length]! as Point3,
        ]),
      )
    }
    if (convexPlanarPolygon(polygon.vertices as Point3[], epsilon))
      return centerFan()

    const vertices = polygon.vertices as Point3[]
    const projection = planarProjection(vertices)
    const indices = earcut(projection.flat, null, 2)
    if (!indices.length) return centerFan()
    const oriented: Point3[][] = []
    for (let i = 0; i + 2 < indices.length; i += 3) {
      const triangle = indices
        .slice(i, i + 3)
        .map((index) => vertices[index]!) as Point3[]
      const [a, b, c] = triangle
      const u = b!.map((value, axis) => value - a![axis]!)
      const v = c!.map((value, axis) => value - a![axis]!)
      const normal = [
        u[1]! * v[2]! - u[2]! * v[1]!,
        u[2]! * v[0]! - u[0]! * v[2]!,
        u[0]! * v[1]! - u[1]! * v[0]!,
      ]
      const orientation = normal.reduce(
        (sum, value, axis) => sum + value * projection.normal[axis]!,
        0,
      )
      oriented.push(
        orientation < 0 ? [triangle[0]!, triangle[2]!, triangle[1]!] : triangle,
      )
    }
    return oriented.map(makeTriangle).filter((triangle) => {
      const [a, b, c] = triangle.vertices
      const u = b!.map((value, axis) => value - a![axis]!)
      const v = c!.map((value, axis) => value - a![axis]!)
      return (
        Math.hypot(
          u[1]! * v[2]! - u[2]! * v[1]!,
          u[2]! * v[0]! - u[0]! * v[2]!,
          u[0]! * v[1]! - u[1]! * v[0]!,
        ) >
        epsilon * epsilon
      )
    })
  })
  const cleaned = geom3.create(triangles)
  // Keep symbol metadata and material/color properties from the native result.
  return {
    ...geometry,
    polygons: cleaned.polygons,
    transforms: cleaned.transforms,
  }
}

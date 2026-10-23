/// <reference path="./upstream-modifiers.d.ts" />
import insertTjunctions from "@jscad/modeling/src/operations/modifiers/insertTjunctions.js"
import type modeling from "@jscad/modeling"

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
    const center: [number, number, number] = [0, 0, 0]
    for (const point of polygon.vertices)
      for (let axis = 0; axis < 3; axis++)
        center[axis]! += point[axis]! / polygon.vertices.length
    return polygon.vertices.map((point, index) => {
      const triangle = kernel.geometries.poly3.create([
        center,
        point,
        polygon.vertices[(index + 1) % polygon.vertices.length]!,
      ])
      if (polygon.color) triangle.color = polygon.color
      return triangle
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

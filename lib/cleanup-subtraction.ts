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
  const generalize = kernel.modifiers.generalize as unknown as (
    options: { snap: boolean; triangulate: boolean },
    shape: typeof geometry,
  ) => typeof geometry
  const cleaned = generalize({ snap: false, triangulate: true }, source)
  geom3.validate(cleaned)
  // Keep symbol metadata and material/color properties from the native result.
  return {
    ...geometry,
    polygons: cleaned.polygons,
    transforms: cleaned.transforms,
  }
}

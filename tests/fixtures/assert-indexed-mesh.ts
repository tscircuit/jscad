import { expect } from "bun:test"
import modeling from "@jscad/modeling"
import type { IndexedMesh } from "../../lib"

export function meshToGeom3(mesh: IndexedMesh) {
  const points = (i: number): [number, number, number] =>
    mesh.positions.slice(i * 3, i * 3 + 3) as [number, number, number]
  const edges = new Map<string, { count: number; winding: number }>()
  const polygons: [number, number, number][][] = []
  expect(mesh.positions.every(Number.isFinite)).toBe(true)
  expect(mesh.indices.length % 3).toBe(0)
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const triangle = mesh.indices.slice(i, i + 3)
    for (let e = 0; e < 3; e++) {
      const a = triangle[e]!,
        b = triangle[(e + 1) % 3]!
      expect(a).toBeGreaterThanOrEqual(0)
      expect(a).toBeLessThan(mesh.positions.length / 3)
      const key = `${Math.min(a, b)},${Math.max(a, b)}`
      const edge = edges.get(key) ?? { count: 0, winding: 0 }
      edge.count++
      edge.winding += a < b ? 1 : -1
      edges.set(key, edge)
    }
    polygons.push(triangle.map(points))
  }
  for (const edge of edges.values()) {
    expect(edge.count).toBe(2)
    expect(edge.winding).toBe(0)
  }
  const geometry = modeling.geometries.geom3.fromPoints(polygons)
  modeling.geometries.geom3.validate(geometry)
  return geometry
}

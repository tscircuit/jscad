import { expect, test } from "bun:test"
import upstream from "@jscad/modeling"
import { cleanupSubtraction } from "../lib/cleanup-subtraction"
import { snapshotSvg } from "./fixtures/snapshot"

test("cleanup triangulates a nonconvex planar polygon inside its boundary", async () => {
  const outline: [number, number, number][] = [
    [0, 0, 0],
    [3, 0, 0],
    [3, 1, 0],
    [1, 1, 0],
    [1, 3, 0],
    [0, 3, 0],
  ]
  const open = upstream.geometries.geom3.create([
    upstream.geometries.poly3.create(outline),
  ])
  const cleaned = cleanupSubtraction(upstream, open)
  const triangles = upstream.geometries.geom3.toPolygons(cleaned)
  const area = (polygon: (typeof triangles)[number]) => {
    const [a, b, c] = polygon.vertices
    const u = b!.map((value, axis) => value - a![axis]!)
    const v = c!.map((value, axis) => value - a![axis]!)
    return (
      Math.hypot(
        u[1]! * v[2]! - u[2]! * v[1]!,
        u[2]! * v[0]! - u[0]! * v[2]!,
        u[0]! * v[1]! - u[1]! * v[0]!,
      ) / 2
    )
  }
  expect(triangles).toHaveLength(4)
  expect(
    triangles.reduce((sum, polygon) => sum + area(polygon), 0),
  ).toBeCloseTo(5, 7)
  expect(await snapshotSvg(cleaned)).toMatchSvgSnapshot(import.meta.path)
}, 30_000)

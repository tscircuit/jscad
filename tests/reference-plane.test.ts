import { expect, test } from "bun:test"
import jscad from "../lib"
import { snapshotSvg } from "./fixtures/snapshot"

test("native construction datums survive transforms and boolean carriers", async () => {
  const { references: r, primitives: p, transforms: t, booleans: b } = jscad
  const plane = t.translateZ(
    8,
    r.reference("mount", p.rectangle({ size: [22, 16] })),
  )
  expect(jscad.geometries.geom3.toPolygons(plane)).toHaveLength(0)
  const solid = b.union(p.cuboid({ size: [20, 14, 12] }), plane)
  expect(jscad.measurements.measureVolume(solid)).toBeCloseTo(20 * 14 * 12)
  expect(r.get(solid, "mount").matrix[14]).toBe(8)
  expect(await snapshotSvg(solid)).toMatchSvgSnapshot(import.meta.path)
}, 30_000)

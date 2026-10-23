import { expect, test } from "bun:test"
import jscad from "../lib"
import { snapshotSvg } from "./fixtures/snapshot"

test("references follow aliases, matrices, centering, CSG and native baking", async () => {
  const {
    references: r,
    primitives: p,
    extrusions: e,
    transforms: t,
    booleans: b,
  } = jscad
  const source = e.extrudeLinear(
    { height: 12, topOutlineName: "top" },
    p.rectangle({ size: [12, 8] }),
  )
  let solid = t.translateX(20, t.rotateY(0.4, t.scale([2, 1, 1], source)))
  solid = b.subtract(
    solid,
    t.translate([20, 0, 5], p.cylinder({ radius: 2, height: 20 })),
  )
  const before = r.get(solid, "top")
  const expected = t.centerX(structuredClone(solid))
  const centered = t.centerX(solid)
  expect(centered.transforms).toEqual(expected.transforms)
  const delta =
    jscad.measurements.measureBoundingBox(structuredClone(centered))[0][0] -
    jscad.measurements.measureBoundingBox(structuredClone(solid))[0][0]
  expect(r.get(centered, "top").matrix[12]).toBeCloseTo(
    before.matrix[12]! + delta,
  )
  jscad.geometries.geom3.toPolygons(centered)
  const moved = t.translateZ(7, centered)
  expect(r.get(moved, "top").matrix[14]).toBeCloseTo(
    r.get(centered, "top").matrix[14]! + 7,
  )
  expect(r.get(source, "top").matrix[12]).toBe(0)
  expect(await snapshotSvg(moved)).toMatchSvgSnapshot(import.meta.path)
})

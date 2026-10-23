import { expect, test } from "bun:test"
import jscad from "../lib"
import { snapshotSvg } from "./fixtures/snapshot"

test("names actual boolean outlines and signed twisted extrusion caps", async () => {
  const {
    primitives: p,
    booleans: b,
    references: r,
    extrusions: e,
    transforms: t,
    maths,
  } = jscad
  const profile = r.nameOutlines(
    b.subtract(
      p.rectangle({ size: [20, 14] }),
      p.circle({ radius: 3, segments: 32 }),
    ),
    { outer: "outer", hole: "bore" },
  )
  const solid = t.translate(
    [8, 3, 12],
    e.extrudeLinear(
      {
        height: -18,
        twistAngle: 0.3,
        twistSteps: 12,
        topOutlineName: "top",
        bottomOutlineName: "bottom",
      },
      profile,
    ),
  )
  expect(r.list(solid)).toEqual([
    "outer",
    "bore",
    "bottom",
    "bottom.outer",
    "bottom.bore",
    "top",
    "top.outer",
    "top.bore",
  ])
  const top = r.get(solid, "top.bore")
  const point = maths.vec3.transform(
    maths.vec3.create(),
    [0, 0, 0],
    top.matrix as any,
  )
  expect(point).toEqual([8, 3, -6])
  expect(jscad.geometries.path2.toPoints(top.geometry as any)).toHaveLength(32)
  // Native geometry readers bake transforms. Reference placement must survive.
  jscad.geometries.geom3.toPolygons(solid)
  expect(r.get(solid, "top.bore")).toEqual(top)
  const copy = r.get(solid, "top.bore")
  copy.matrix[12] = 1000
  expect(r.get(solid, "top.bore").matrix[12]).toBe(8)
  expect(await snapshotSvg(solid)).toMatchSvgSnapshot(import.meta.path)
})

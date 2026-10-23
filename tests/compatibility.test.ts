import { expect, test } from "bun:test"
import upstream from "@jscad/modeling"
import jscad, { withReferences } from "../lib"
import { snapshotSvg } from "./fixtures/snapshot"

test("ordinary upstream geometry and variadic operations remain compatible", async () => {
  expect(withReferences(upstream)).toBe(jscad)
  const build = (k: typeof upstream) =>
    k.transforms.translate(
      [2, 4, 6],
      k.extrusions.extrudeLinear(
        { height: 8 },
        k.booleans.subtract(
          k.primitives.rectangle({ size: [20, 14] }),
          k.primitives.circle({ radius: 3, segments: 32 }),
        ),
      ),
    )
  const result = build(jscad)
  expect(result).toEqual(build(upstream))
  upstream.geometries.geom3.validate(result)
  expect(jscad.transforms.translate([1, 2, 3], [result, result])).toEqual(
    upstream.transforms.translate([1, 2, 3], [result, result]),
  )
  expect(await snapshotSvg(result)).toMatchSvgSnapshot(import.meta.path)
})

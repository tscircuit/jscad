import { expect, test } from "bun:test"
import jscad from "../lib"
import { snapshotSvg } from "./fixtures/snapshot"

test("ambiguous names and missing boundaries fail without guessing", async () => {
  const { references: r, primitives: p, booleans: b, extrusions: e } = jscad
  const rectangle = p.rectangle({ size: [20, 14] })
  expect(() => r.name(" ", rectangle)).toThrow("nonempty")
  expect(() => r.nameOutlines(rectangle, { hole: "bore" })).toThrow(
    "exactly one",
  )
  const twoHoles = b.subtract(
    rectangle,
    jscad.transforms.translateX(-4, p.circle({ radius: 2 })),
    jscad.transforms.translateX(4, p.circle({ radius: 2 })),
  )
  expect(() => r.nameOutlines(twoHoles, { hole: "bore" })).toThrow("found 2")
  expect(() => r.name("face", r.name("face", rectangle))).toThrow("Duplicate")
  expect(() => r.get(rectangle, "absent")).toThrow("Unknown")
  expect(() =>
    e.extrudeLinear({ height: Infinity, topOutlineName: "top" }, rectangle),
  ).toThrow("Invalid")
  const solid = e.extrudeLinear(
    { height: 8, topOutlineName: "__proto__" },
    twoHoles,
  )
  expect(r.list(solid)).toEqual(["__proto__"])
  expect(await snapshotSvg(solid)).toMatchSvgSnapshot(import.meta.path)
}, 30_000)

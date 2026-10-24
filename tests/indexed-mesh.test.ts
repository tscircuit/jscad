import { expect, test } from "bun:test"
import upstream from "@jscad/modeling"
import { geom3ToIndexedMesh } from "../lib"
import { meshToGeom3 } from "./fixtures/assert-indexed-mesh"
import { snapshotSvg } from "./fixtures/snapshot"

test("indexed export preserves shared triangle edges and through holes after raw boolean operations", async () => {
  const { cuboid, cylinder } = upstream.primitives
  const plate = cuboid({ size: [40, 25, 4], center: [0, 0, 2] })
  const boss = cuboid({ size: [10, 12, 4], center: [0, 0, 6] })
  const holes = [-12, 12].flatMap((x) =>
    [-6, 6].map((y) =>
      cylinder({ radius: 2, height: 6, center: [x, y, 2], segments: 32 }),
    ),
  )
  const solid = upstream.transforms.translate(
    [2, 3, 4],
    upstream.booleans.subtract(upstream.booleans.union(plate, boss), ...holes),
  )
  const before = structuredClone(solid)
  const mesh = geom3ToIndexedMesh(solid)
  const exported = meshToGeom3(mesh)
  expect(solid).toEqual(before)
  expect(
    upstream.measurements.measureVolume(exported) /
      upstream.measurements.measureVolume(structuredClone(solid)),
  ).toBeCloseTo(1, 3)
  expect(() => geom3ToIndexedMesh(upstream.geometries.geom3.create())).toThrow(
    "nonempty",
  )
  expect(await snapshotSvg(exported)).toMatchSvgSnapshot(import.meta.path)
}, 30_000)

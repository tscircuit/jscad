import { encodePNG, renderDrawCalls, type DrawCall } from "poppygl"
import jscad, { type NativeGeometry } from "../../lib"
import "bun-match-svg"

export async function snapshotSvg(solid: NativeGeometry) {
  const positions: number[] = []
  for (const polygon of jscad.geometries.geom3.toPolygons(
    structuredClone(solid) as any,
  )) {
    for (let i = 1; i + 1 < polygon.vertices.length; i++)
      positions.push(
        ...polygon.vertices[0]!,
        ...polygon.vertices[i]!,
        ...polygon.vertices[i + 1]!,
      )
  }
  const material = {
    baseColorFactor: [0.62, 0.72, 0.82, 1] as [number, number, number, number],
    baseColorTexture: null,
  }
  const base = {
    normals: null,
    uvs: null,
    indices: null,
    model: new Float32Array(jscad.maths.mat4.create()),
    material,
  }
  const calls: DrawCall[] = [
    { ...base, positions: new Float32Array(positions) },
  ]
  const debugPoints: {
    label: string
    position: { x: number; y: number; z: number }
  }[] = []
  for (const name of jscad.references.list(solid)) {
    const ref = jscad.references.get(solid, name)
    const outlines = jscad.geometries.geom2.isA(ref.geometry)
      ? jscad.geometries.geom2.toOutlines(ref.geometry as any)
      : [jscad.geometries.path2.toPoints(ref.geometry as any)]
    const first = outlines[0]?.[0]
    if (first) {
      const [x, y, z] = jscad.maths.vec3.transform(
        jscad.maths.vec3.create(),
        [first[0], first[1], 0],
        ref.matrix as any,
      )
      debugPoints.push({ label: name, position: { x: x!, y: y!, z: z! } })
    }
    const lines: number[] = []
    for (const points of outlines)
      for (let i = 0; i < points.length; i++) {
        for (const p of [points[i]!, points[(i + 1) % points.length]!]) {
          lines.push(
            ...jscad.maths.vec3.transform(
              jscad.maths.vec3.create(),
              [p[0], p[1], 0],
              ref.matrix as any,
            ),
          )
        }
      }
    calls.push({
      ...base,
      positions: new Float32Array(lines),
      mode: 1,
      material: { ...material, baseColorFactor: [0.85, 0.2, 0.1, 1] },
    })
  }
  const rendered = renderDrawCalls(calls, {
    width: 480,
    height: 360,
    debugPoints,
    debugFontSize: 10,
    debugPointColor: [0.85, 0.2, 0.1],
    debugLabelColor: [0.4, 0.4, 0.4],
    up: "z+",
    showEdges: true,
    ambient: 0.6,
    lineWidth: 2,
    backgroundColor: "#ffffff",
  })
  const png = await encodePNG(rendered.bitmap)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="390"><rect width="480" height="390" fill="white"/><image width="480" height="360" href="data:image/png;base64,${Buffer.from(png).toString("base64")}"/><text x="12" y="382" font-size="12" fill="#666">${jscad.references.list(solid).join(", ").replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</text></svg>`
}

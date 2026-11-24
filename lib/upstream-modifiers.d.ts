declare module "@jscad/modeling/src/operations/modifiers/insertTjunctions.js" {
  type Polygon = import("@jscad/modeling").geometries.poly3.Poly3
  const insertTjunctions: (polygons: Polygon[]) => Polygon[]
  export default insertTjunctions
}

declare module "@jscad/modeling/src/operations/extrusions/earcut/index.js" {
  const earcut: (
    data: number[],
    holeIndices: number[] | null,
    dimension?: number,
  ) => number[]
  export default earcut
}

declare module "@jscad/modeling/src/operations/modifiers/insertTjunctions.js" {
  type Polygon = import("@jscad/modeling").geometries.poly3.Poly3
  const insertTjunctions: (polygons: Polygon[]) => Polygon[]
  export default insertTjunctions
}

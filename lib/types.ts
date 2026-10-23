import type modeling from "@jscad/modeling"

export type NativeGeometry =
  | modeling.geometries.geom2.Geom2
  | modeling.geometries.path2.Path2
  | modeling.geometries.geom3.Geom3
export type NativeProfile =
  | modeling.geometries.geom2.Geom2
  | modeling.geometries.path2.Path2

/** Apply the full model-space matrix after reading the native planar points. */
export interface NativeReference {
  geometry: NativeProfile
  matrix: number[]
}

/** Roles select actual output boundaries. Ambiguous roles are rejected. */
export interface OutlineNames {
  outer?: string
  hole?: string
}

export interface ReferenceApi {
  name<T extends NativeProfile>(name: string, geometry: T): T
  nameOutlines<T extends modeling.geometries.geom2.Geom2>(
    geometry: T,
    names: OutlineNames,
  ): T
  /** A non-rendering native geometry carrier for a named planar datum. */
  reference(
    name: string,
    geometry: NativeProfile,
  ): modeling.geometries.geom3.Geom3
  get(geometry: NativeGeometry, name: string): NativeReference
  list(geometry: NativeGeometry): string[]
  collect(
    geometries: NativeGeometry | readonly NativeGeometry[],
  ): Record<string, NativeReference>
}

export type ExtrudeLinearOptions = Parameters<
  typeof modeling.extrusions.extrudeLinear
>[0] & {
  /** Full profile at the signed height endpoint, after twist in radians. */
  topOutlineName?: string
  /** Full profile at local Z=0. Child boundaries receive this name prefix. */
  bottomOutlineName?: string
}

export type CompatibleJscad = typeof modeling & {
  references: ReferenceApi
  extrusions: typeof modeling.extrusions & {
    extrudeLinear(
      options: ExtrudeLinearOptions,
      profile: NativeProfile,
    ): modeling.geometries.geom3.Geom3
  }
}

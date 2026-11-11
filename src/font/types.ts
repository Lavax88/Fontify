/**
 * Fontify - Font Parser Type Definitions
 */

export interface VariationAxis {
  tag: string;
  name: string;
  min: number;
  default: number;
  max: number;
  current: number;
}

export interface NamedInstance {
  name: string;
  values: Record<string, number>;
}

export interface FontInfo {
  valid: boolean;
  error?: string;
  isVariable: boolean;
  isCollection: boolean;
  format: string;
  familyName: string;
  subfamilyName: string;
  fullName: string;
  postscriptName: string;
  version: string;
  axes: VariationAxis[];
  instances: NamedInstance[];
  numGlyphs: number;
  unitsPerEm: number;
}

export type ParseResult =
  | { success: true; font: FontInfo }
  | { success: false; error: string; font: FontInfo };

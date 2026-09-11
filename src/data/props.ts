import type { Vec3 } from "@/types";

export type PropCategory = "FURNITURE" | "HANDHELD" | "SET_DRESSING" | "VEHICLE" | "LIGHTING";

export interface PropDefinition {
  id: string;
  name: string;
  category: PropCategory;
  thumbnail: string;
  assetPath: string | null;
  builder: string;
  /** Approximate bounding size in metres (x, y, z) for selection + snapping. */
  size: Vec3;
  /** Props that live on a surface start at this height instead of the floor. */
  restsOnSurface: boolean;
}

export const PROPS: PropDefinition[] = [
  { id: "chair", name: "Chair", category: "FURNITURE", thumbnail: "#6b5a44", assetPath: null, builder: "chair", size: [0.5, 0.95, 0.5], restsOnSurface: false },
  { id: "table", name: "Table", category: "FURNITURE", thumbnail: "#7a6547", assetPath: null, builder: "table", size: [1.4, 0.75, 0.9], restsOnSurface: false },
  { id: "phone", name: "Phone", category: "HANDHELD", thumbnail: "#2b2f36", assetPath: null, builder: "phone", size: [0.075, 0.01, 0.15], restsOnSurface: true },
  { id: "laptop", name: "Laptop", category: "HANDHELD", thumbnail: "#3c4249", assetPath: null, builder: "laptop", size: [0.34, 0.24, 0.24], restsOnSurface: true },
  { id: "coffee_cup", name: "Coffee Cup", category: "HANDHELD", thumbnail: "#cfc4b4", assetPath: null, builder: "coffee_cup", size: [0.09, 0.1, 0.09], restsOnSurface: true },
  { id: "lamp", name: "Lamp", category: "LIGHTING", thumbnail: "#c9a227", assetPath: null, builder: "lamp", size: [0.34, 1.5, 0.34], restsOnSurface: false },
  { id: "door", name: "Door", category: "SET_DRESSING", thumbnail: "#5a4b39", assetPath: null, builder: "door", size: [0.9, 2.05, 0.08], restsOnSurface: false },
  { id: "bed", name: "Bed", category: "FURNITURE", thumbnail: "#6a6370", assetPath: null, builder: "bed", size: [1.5, 0.55, 2.0], restsOnSurface: false },
  { id: "plant", name: "Plant", category: "SET_DRESSING", thumbnail: "#4d6b46", assetPath: null, builder: "plant", size: [0.5, 1.1, 0.5], restsOnSurface: false },
  { id: "car", name: "Car", category: "VEHICLE", thumbnail: "#3f4a55", assetPath: null, builder: "car", size: [1.85, 1.45, 4.4], restsOnSurface: false },
];

export const PROP_CATEGORIES: PropCategory[] = [
  "FURNITURE",
  "HANDHELD",
  "SET_DRESSING",
  "LIGHTING",
  "VEHICLE",
];

export function getPropDefinition(id: string): PropDefinition {
  return PROPS.find((p) => p.id === id) ?? PROPS[0];
}

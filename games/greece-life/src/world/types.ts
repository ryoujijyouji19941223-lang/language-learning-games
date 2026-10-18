import type * as THREE from 'three';
import type { Line } from '../data/npcs';
import type { Shape, ShapeGrid } from '../core/geo';

export type InteractKind =
  | 'enter' | 'exit' | 'homeDoor' | 'counter' | 'office' | 'npc' | 'bench' | 'bed' | 'kitchen' | 'wardrobe'
  | 'dest' | 'mirror' | 'jobStation' | 'balconyDoor';

export interface Interactable {
  id: string;
  area: string;
  kind: InteractKind;
  ref: string;
  x: number;
  z: number;
  r: number;
  /** Optional facing check: the player should roughly face this point. */
  label?: Line;
}

export interface SignInfo { area: string; x: number; y: number; z: number; el: string; en: string; sign: string }

export interface DynamicShape { shape: Shape; active: () => boolean }

export interface Area {
  id: string;
  group: THREE.Group;
  grid: ShapeGrid;
  dynamic: DynamicShape[];
  interactables: Interactable[];
  /** null: use the terrain height; a number: flat floor at this height. */
  floorY: number | null;
  /** Walkable rectangle for interiors (world coordinates). */
  bounds?: { x0: number; z0: number; x1: number; z1: number }[];
  /** Interior walls that fade when they come between camera and player. */
  walls: { mesh: THREE.Mesh; nx: number; nz: number; px: number; pz: number }[];
  spawn: { x: number; z: number; yaw: number };
  /** Where you appear outside when leaving. */
  exit?: { area: string; x: number; z: number; yaw: number };
  /** Zone points inside (e.g. café tables), world coordinates. */
  zones: Record<string, [number, number][]>;
  /** Staff standing points by shop id. */
  staff: Record<string, [number, number, number][]>;
  update?: (dt: number, t: number) => void;
  /** Stair treads: standing inside one lifts you to its top. */
  steps?: ShapeGrid;
}

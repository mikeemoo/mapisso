import { Vector2 } from 'three';

export type Coord = {
  lat: number;
  lon: number;
};

export type Tags = { [k: string] : string };;

export type WeightedPoly = {
  poly: Vector2[];
  area: number;
  bounds: Bounds;
}

export type Bounds = {
  x: number;
  y: number;
  w: number;
  h: number;
  maxX: number;
  maxY: number;
  lines: Vector2[][];
  metadata: any;
}

export type Node = {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
  position: Vector2;
  tags: Tags;
  ways: Way[];
  relations: Relation[];
}

export type Way = {
  type: 'way';
  id: number;
  tags: Tags;
  nodes: Node[];
  relations: Relation[];
}

export type Member = {
  type: 'way' | 'node';
  element: Way | Node;
  ref: number,
  role: string;
};

export type Relation = {
  type: 'relation',
  id: number;
  tags: Tags;
  members: Member[];
};

export type Element = Node | Way | Relation;
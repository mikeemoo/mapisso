import { Vector2 } from 'three';
import { Bounds, WeightedPoly } from './types';
import pointInPoly from 'robust-point-in-polygon';
import Coordinate from 'jsts/org/locationtech/jts/geom/Coordinate';
import GeometryFactory from 'jsts/org/locationtech/jts/geom/GeometryFactory';
import BufferOp from 'jsts/org/locationtech/jts/operation/buffer/BufferOp';

export const offsetLine = (line: Vector2[], distance: number) => {
  const p1: Vector2[] = [];
  const p2: Vector2[] = [];
  let direction: Vector2 | null = null;
  const newLine = [...line];
  for (let i = 0; i < line.length - 1; i++) {

    direction = line[i + 1].clone().sub(line[i]).normalize();

    p1.push(
      new Vector2(-direction.y, direction.x)
        .multiplyScalar(distance)
        .add(line[i])
    );
    
    p2.push(
      new Vector2(-direction.y, direction.x)
        .multiplyScalar(distance)
        .add(line[i + 1])
    );
  }

  newLine[0] = p1[0].clone();
  newLine[newLine.length - 1] = p2[p2.length - 1].clone();

  for (let i = 1; i < p1.length; i++) {
    const r = p2[i - 1].clone().sub(p1[i - 1]);
    const s = p2[i].clone().sub(p1[i]);
    const cross = r.cross(s);
    if (cross === 0) {
      break;
    }

    const p = p1[i - 1].clone();
    const q = p1[i].clone();

    const qmp = q.sub(p);
    const num = qmp.cross(s);
    const t = num / cross;
    const m = r.multiplyScalar(t);
    newLine[i] = p.add(m);
  }
  return newLine;
}

export const thicken = (line: Vector2[], lineWidth: number, targetWidth: number): Vector2[][] => {
  const numLines = Math.ceil(targetWidth / lineWidth);
  if (numLines === 1) {
    return [ line ];
  }
  const start = -(targetWidth / 2) + lineWidth / 2;
  const end = -start;
  const offsets = [start];
  const spacing = (end - start) / (numLines - 1);
  let offset = start;
  for (let i = 0; i < numLines - 2; i++) {
    offset += spacing;
    offsets.push(offset);
  }
  offsets.push(end);

  return offsets.map((offset) => offsetLine(line, offset));
};

export const split = (line: Vector2[], maxLength: number): Vector2[] => {
  const points = pointsEvery(line, maxLength).map(({ coord }) => coord);
  points.push(line[line.length - 1]);
  return points;
}

export const pointsEvery = (line: Vector2[], distance: number) => {
  const lengths: number[] = [];
  let prevLen = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const len = line[i].distanceTo(line[i + 1]);
    const nextLen = prevLen + len;
    prevLen = nextLen;
    lengths.push(nextLen);
  }

  const points: { coord: Vector2, direction: Vector2 }[] = [];
  let sI = 0;

  for (let d = 0; d < lengths[lengths.length - 1]; d += distance) {
    for (let i = sI; i < lengths.length; i++) {
      if (d < lengths[i]) {
        const pFrom = line[i];
        const pTo = line[i + 1];
        const pD = lengths[i - 1] || 0;
        const f = (d - pD) / (lengths[i] - pD);
        const x = pFrom.x + (pTo.x - pFrom.x) * f;
        const y = pFrom.y + (pTo.y - pFrom.y) * f;
        sI = i;
        const aX = pTo.x - pFrom.x;
        const aY = pTo.y - pFrom.y;
        const len = Math.sqrt(aX * aX + aY * aY) || 1;
        points.push({
          coord: new Vector2(x, y),
          direction: new Vector2(aX / len, aY / len )
        });
        break;
      }
    }
  }
  return points;
}

export const bounds = (lines: Vector2[][], metadata: any): Bounds => {
  let minX: number | null = null;
  let minY: number | null = null;
  let maxX: number | null = null;
  let maxY: number | null = null;
  lines.forEach((line) => {
    line.forEach((point) => {
      minX = minX === null || point.x < minX ? point.x : minX;
      minY = minY === null || point.y < minY ? point.y : minY;
      maxX = maxX === null || point.x > maxX ? point.x : maxX;
      maxY = maxY === null || point.y > maxY ? point.y : maxY;
    });
  });

  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
    maxX,
    maxY,
    lines,
    metadata
  };
}

export const intersection = ([ p, p2 ]: [ Vector2, Vector2 ], [ q, q2 ]: [Vector2, Vector2]): Vector2 => {
  const r = p2.clone().sub(p);
  const s = q2.clone().sub(q);
  const rxs = r.cross(s);
  const rxsIsZero = Math.abs(rxs) < 0.00000001;
  if (rxsIsZero) {
    return null;
  }
  const t = q.clone().sub(p).cross(s) / rxs;
  const u = q.clone().sub(p).cross(r) / rxs;
  if ((0 <= t && t <= 1) && (0 <= u && u <= 1)) {
    return p.clone().add(r.multiplyScalar(t));
  }
  return null;
}

export const fill = (polygons: { shell: Vector2[], holes: Vector2[][] }[], lineWidth: number): Vector2[][] => {
  const factory = new GeometryFactory();

  const lines: Vector2[][] = [];
  
  const jstsPolys = factory.createMultiPolygon(polygons.map((polygon) => 
    factory.createPolygon(
      factory.createLinearRing(polygon.shell.map((point) => new Coordinate(point.x, point.y, 0))),
      polygon.holes.map((hole) => factory.createLinearRing(hole.map((point) => new Coordinate(point.x, point.y, 0))))
    ) 
  ));

  polygons.forEach(({ shell, holes }) => {
    lines.push(shell);
    lines.push(...holes);
  });

  let j = 0;
  while (true) {
    const tmpReducedPoly = BufferOp.bufferOp(jstsPolys, -((lineWidth * 0.5) * j));
    const reducedPoly = tmpReducedPoly._geometries ? tmpReducedPoly : { _geometries: [tmpReducedPoly] };
    if (reducedPoly._geometries.length === 0 || (reducedPoly._geometries.length === 1 && reducedPoly._geometries[0]._shell._points._coordinates.length === 0)) {
      break;
    }
    reducedPoly._geometries.forEach((poly) => {
      lines.push(poly._shell._points._coordinates.map((point) => new Vector2(point.x, point.y)));
      lines.push(...poly._holes.map((hole) => hole._points._coordinates.map((point) => new Vector2(point.x, point.y))));
    });
    j++;
  }

  return lines;
}

export const hacture = (polygons: Vector2[][], gap: number) => {
  const bb = bounds(polygons, null);
  let edges: [Vector2, Vector2][] = polygons.map((poly, i) => {
      const all: [Vector2, Vector2][] = [];
      for (let i = 0; i < poly.length - 1; i++) {
        all.push([ poly[i], poly[i + 1] ])
      }
      return all;
    })
    .flat()
    .filter((edge) => !(edge[0].y < bb.y && edge[1].y < bb.y && edge[0].y > bb.maxY && edge[1].y > bb.maxY));
  edges.sort((a, b) => Math.min(a[0].x, a[1].x) - Math.min(b[0].x, b[1].x));
  const startY = Math.floor(bb.y / 50) * 50;
  const segments = [];
  for (let y = startY; y < bb.maxY; y += gap) {
    const scanLine: [Vector2, Vector2] = [
      new Vector2(bb.x - 1, y),
      new Vector2(bb.maxX + 1, y)
    ];
    let p1: Vector2 | null = null;
    edges.forEach((edge) => {
      const inter = intersection(scanLine, edge);
      if (inter) {
        if (!p1) {
          p1 = inter;
        } else {
          segments.push([ p1, inter ])
          p1 = null;
        }
      }
    });
    edges = edges.filter((edge) => edge[0].y > y || edge[1].y > y);
  }
  return segments;
}

export const distanceToPointSq = (line: Vector2[], point: Vector2) => {
  let distanceSq = Number.MAX_VALUE;
  for (let i = 0; i < line.length - 1; i++) {
    const l2 = line[i].distanceToSquared(line[i + 1]);
    if (l2 == 0) {
      break;
    }
    const p = point.clone().sub(line[i]).dot(line[i + 1].clone().sub(line[i]));
    const t = Math.max(0, Math.min(1, p / l2));
    const projection = line[i].clone().add(line[i + 1].clone().sub(line[i]).multiplyScalar(t));
    const d = point.distanceToSquared(projection);
    distanceSq = distanceSq === null ? d : Math.min(d, distanceSq);
  }
  return distanceSq;
}

export const centerBounds = (bounds: Bounds) => new Vector2(bounds.x + (bounds.w / 2), bounds.y + (bounds.h / 2));

export const expandBounds = (bounds: Bounds, width: number, height: number): Bounds => {
  return {
    ...bounds,
    x: bounds.x - width,
    y: bounds.y - height,
    w: bounds.w + width * 2,
    h: bounds.h + height * 2,
    maxX: bounds.maxX + width,
    maxY: bounds.maxY + height
  };
}

export const translateBounds = (bounds: Bounds, move: Vector2) => {
  return {
    ...bounds,
    x: bounds.x + move.x,
    y: bounds.y + move.y,
    maxX: bounds.maxX + move.x,
    maxY: bounds.maxY + move.y,
  }
}

export const area = (polygon: Vector2[]): number => {
  let len = polygon.length - 1;
  if (len % 2 !== 0) {
    polygon.push(polygon[0]);
  }
  let area = 0;
  for (let i = 0; i < len; i += 2 ) {
    area += polygon[i+1].x * (polygon[i+2].y - polygon[i].y) + polygon[i+1].y * (polygon[i].x - polygon[i+2].x);
  }
  return Math.abs(area / 2);
}

export const pointFinder = (polygons: Vector2[][]) => {
  const weightedPolys = polygons.map((poly) => ({
    poly,
    area: area(poly),
    bounds: bounds([poly], {})
  }));

  const totalArea = weightedPolys.reduce((sum, item) => sum + item.area, 0);

  return () => {
    const roll = Math.random() * totalArea;
    let total = 0;
    let selection: WeightedPoly | null = null;
    for (let i = 0; i < weightedPolys.length; i++) {
      total += weightedPolys[i].area;
      if (total > roll) {
        selection = weightedPolys[i];
        break;
      }
    }
    
    while (true) {
      const point = new Vector2(
        selection.bounds.x + (Math.random() * selection.bounds.w),
        selection.bounds.y + (Math.random() * selection.bounds.h)
      );

      if (pointInPoly(selection.poly.map((v) => [v.x, v.y]), [point.x, point.y]) === -1) {
        return point;
      }
    }
  }
}

export const boundsOverlap = (one: Bounds, two: Bounds) => {
  return  one.x < two.maxX &&
          one.maxX > two.x &&
          one.y < two.maxY &&
          one.maxY > two.y;
}

export function rotateAll(lines: Vector2[][], center: Vector2, angle: number): Vector2[][] {
  return lines.map((line) => rotate(line, center, angle));
}

export function rotate(line: Vector2[], center: Vector2, angle: number): Vector2[] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return line.map((point) => new Vector2(
    (cos * (point.x - center.x)) + (sin * (point.y - center.y)) + center.x,
    (cos * (point.y - center.y)) - (sin * (point.x - center.x)) + center.y
  ));
}
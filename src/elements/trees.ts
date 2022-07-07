
import { Way } from '../types';
import QuadTree from 'simple-quadtree';
import { Vector2 } from 'three';
import { distanceToPointSq, bounds, expandBounds, pointFinder } from '../utils';

export default function trees(qt: QuadTree, _lineWidth: number, zoomMultiplier: number) {

  const woodPolys: Vector2[][] = [];

  function way(way: Way) {

    if (
      way.tags.landuse !== "forest" &&
      way.tags.landuse !== "orchard" &&
      way.tags.natural !== "wood" &&
      way.tags.natural !== "tree_row" &&
      !way.relations.some((relation) => relation.tags.natural === 'wood')
    ) {
      return;
    }

    const coords = way.nodes.map((node) => node.position);
    coords.push(coords[0]);

    woodPolys.push(coords);
  }

  function post() {

    console.log('trees.post');

    if (woodPolys.length === 0) {
      return;
    }

    const minTreeRadius = 0.8;
    const maxTreeRadius = 1.2;

    const rX = maxTreeRadius - minTreeRadius;
    const rStep = rX / 5;

    const bbox = bounds(woodPolys, {});
    const treeQt = QuadTree(bbox.x, bbox.y, bbox.w, bbox.h);

    const findPoint = pointFinder(woodPolys);

    let missesInARow = 0;

    for (let i = 0; i < 25000; i++) {

      const point = findPoint();
      let placed = false;

      for (let radius = maxTreeRadius; radius >= minTreeRadius; radius -= rStep) {
        
        const points = [];
        for (let i = 0; i <= 360; i += 20) {
          const x3 =
            Math.cos(i * (Math.PI / 180)) *
            (radius * (0.8 + Math.random() * 0.4));
          const y3 =
            Math.sin(i * (Math.PI / 180)) *
            (radius * (0.8 + Math.random() * 0.4));
          points.push(new Vector2(point.x + x3, point.y + y3));
        }
        const trunk = [
          new Vector2(point.x, point.y + radius),
          new Vector2(point.x, point.y + radius + (radius * 0.8))
        ];
        const bbox = bounds([ points, trunk ], { radius, point, deleteAll: true });
        const expandedBBox = expandBounds(bbox, 3, 3);
        
        if (!treeQt.get(bbox).some((other) => 
          (((other.metadata.point.x - point.x) ** 2) + ((other.metadata.point.y - point.y) ** 2)) < (radius + other.metadata.radius) ** 2
        )) {
          if (qt.get(expandedBBox).every(({ lines }) => lines.every((line) => distanceToPointSq(line, point) > (radius * 1.5) ** 2))) {
            qt.put(bbox);
            treeQt.put(bbox);
            placed = true;
          }
        }
      }
      missesInARow = placed ? 0 : missesInARow + 1;
      if (missesInARow > 200) {
        console.log('too many misses');
        break;
      }
    }
  }

  return {
    way,
    post
  }
}
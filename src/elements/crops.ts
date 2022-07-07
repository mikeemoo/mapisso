
import { Way } from '../types';
import QuadTree from 'simple-quadtree';
import { Vector2 } from 'three';
import { distanceToPointSq, bounds, expandBounds, pointFinder } from '../utils';

export default function crops(qt: QuadTree, lineWidth: number, zoomMultiplier: number) {

  const farmPolys: Vector2[][] = [];

  function way(way: Way) {
    
    if (way.tags?.landuse !== 'farmland') {
      return;
    }

    const coords = way.nodes.map((node) => node.position);
    coords.push(coords[0]);
    farmPolys.push(coords);
  }

  function post() {

    console.log('crops.post');

    if (farmPolys.length === 0) {
      return;
    }

    const cropSize = 1;

    const findPoint = pointFinder(farmPolys);
    let missesInARow = 0;

    for (let i = 0; i < 6000; i++) {
      let placed = false;
      
      const point = findPoint();
      const line = [
        new Vector2(point.x - (cropSize / 2), point.y - cropSize),
        new Vector2(point.x, point.y),
        new Vector2(point.x + (cropSize / 2), point.y - cropSize)
      ]
      const bbox = bounds([ line ], { deleteAll: true });
      const expandedBBox = expandBounds(bbox, 3, 3);
      if (qt.get(expandedBBox).every(({ lines }) => lines.every((line) => distanceToPointSq(line, point) > 8 ** 2))) {
        placed = true;
        qt.put(bbox);
      }

      missesInARow = placed ? 0 : missesInARow + 1;
      if (missesInARow > 100) {
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
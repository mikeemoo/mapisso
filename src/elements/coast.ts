
import { Way } from '../types';
import QuadTree from 'simple-quadtree';
import { pointsEvery, bounds } from '../utils';
import { Vector2 } from 'three';

export default function streams(qt: QuadTree, lineWidth: number, zoomMultiplier: number) {
  function way (way: Way) {

    if (way.tags.natural !== 'coastline') {
      return null;
    }

    const lines: Vector2[][] = [way.nodes.map((node) => node.position)];

    console.log('coast', lines);

    qt.put(bounds(lines, {}));
  }

  return {
    way
  }

}
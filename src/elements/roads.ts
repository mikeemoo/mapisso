
import { Way } from '../types';
import QuadTree from 'simple-quadtree';
import { thicken, bounds } from '../utils';

export default function roads(qt: QuadTree, lineWidth: number, zoomMultiplier: number) {

  function way(way: Way, roadTypes: { [k: string]: number }) {
    if (!way.tags.highway || !roadTypes[way.tags.highway]) {
      return;
    }
  
    const points = way.nodes.map((node) => node.position);
  
    const thickerLines = thicken(
      points,
      lineWidth,
      lineWidth * roadTypes[way.tags.highway]
    );
  
    qt.put(bounds(thickerLines, { type: 'road' }));

  }

  return {
    way
  }
};
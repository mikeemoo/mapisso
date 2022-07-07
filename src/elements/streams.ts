
import { Way } from '../types';
import QuadTree from 'simple-quadtree';
import { thicken, bounds } from '../utils';

export default function streams(qt: QuadTree, lineWidth: number, zoomMultiplier: number) {
  function way (way: Way, thickness: number) {

    if (!way.tags.waterway || way.tags.waterway !== 'stream') {
      return null;
    }

    const middleLine = way.nodes.map((node) => node.position);

    const lines = thicken(
      middleLine,
      lineWidth,
      lineWidth * thickness
    );


    qt.put(bounds(lines, {}));
  }

  return {
    way
  }
}
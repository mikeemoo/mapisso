
import { Way } from '../types';
import QuadTree from 'simple-quadtree';
import { Vector2 } from 'three';
import { thicken, pointsEvery, bounds } from '../utils';

export default function railways(qt: QuadTree, lineWidth: number, zoomMultiplier: number) {
  
  function way(way: Way, thicknessMultiplier: number) {
    if (way.tags.railway !== 'rail' || way.tags.service) {
      return null;
    }
  
    const thickness = lineWidth * thicknessMultiplier;
    const middleLine = way.nodes.map((node) => node.position);
  
    const sleeperLength = thickness * 2;
  
    const sleepers = pointsEvery(middleLine, thickness * 4).map(({ coord, direction }) => {
      const tangent = new Vector2(-direction.y, direction.x).multiplyScalar(sleeperLength);
      return thicken([
          coord.clone().add(tangent),
          coord.clone().sub(tangent),
        ],
        lineWidth,
        thickness
      );
    });
  
    const lines = [
      ...thicken(
        middleLine,
        lineWidth,
        thickness
      ),
      ...sleepers.flat()
    ];
    
    qt.put(bounds(lines, { }));
  }

  return {
    way
  }
}
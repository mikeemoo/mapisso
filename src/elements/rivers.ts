
import { Way } from '../types';
import QuadTree from 'simple-quadtree';
import { Vector2 } from 'three';
import { hacture, bounds, split } from '../utils';
import { noise } from '@chriscourses/perlin-noise';

const ways: Way[] = [];

export default function rivers(qt: QuadTree, _lineWidth: number, zoomMultiplier: number) {

  function way(way: Way) {
    if (way.tags.natural !== 'water' &&
        !way.relations.some((relation) => relation.tags.natural === 'water')    
    ) {
      return;
    }
  
    ways.push(way);
  }
  
  function post() {

    console.log('rivers.post');

    const polygons: Vector2[][] = ways.map((way) => {
      const points = way.nodes.map((node) => node.position);
      return [...points, points[0]];
    });

    hacture(polygons, 2).forEach(
      (line) => {
        const newLine = split(line, 0.3).map((point) => new  Vector2(point.x, point.y + (noise(point.x * 2, point.y * 2) - 0.5) * 1.4));
        const env = bounds([newLine], {});
        qt.put(env);
      }
    );

    polygons.forEach((poly) => {
      const env = bounds([poly], {});
      qt.put(env);
    });

  }

  return {
    way,
    post
  }
};

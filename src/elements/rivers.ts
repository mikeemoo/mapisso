
import { Relation, Way } from '../types';
import QuadTree from 'simple-quadtree';
import { Vector2 } from 'three';
import { hacture, bounds, split, combineSegments } from '../utils';
import { noise } from '@chriscourses/perlin-noise';

const ways: Way[] = [];
const relations: Relation[] = [];

export default function rivers(qt: QuadTree, _lineWidth: number, zoomMultiplier: number) {

  function relation(relation: Relation) {
    if (relation.tags.natural !== 'water') {
      return;
    }
    relations.push(relation);
  }

  function way(way: Way) {
    if (way.tags.natural !== 'water' || way.relations.some((relation) => relation.tags.natural === 'water')    
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


    relations.forEach((relation) => {
      const outerMembers = relation.members.filter((member) => member.role === 'outer');
      const outerWays = outerMembers.map((member) => member.element) as Way[];
      const outerPolygon = combineSegments(outerWays);
      polygons.push(outerPolygon);
    })

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
    relation,
    way,
    post
  }
};

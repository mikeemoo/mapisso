
import { Node } from '../types';
import QuadTree from 'simple-quadtree';

export default function terrain(qt: QuadTree, lineWidth: number, zoomMultiplier: number) {

  function node(node: Node) {
    // if (node.tags.natural !== 'peak' && node.tags.natural !== 'hill') {
    //   return;
    // }

    // const line: Vector2[] = [];
    // for (let x = -(lineWidth * 5); x < 0; x += lineWidth) {
    //   line.push(new Vector2(node.position.x + x, node.position.y + 2));
    //   line.push(new Vector2(node.position.x, node.position.y - 2));
    // }
    // console.log('adding');
    // const bbox = bounds([ line ], { deleteAll: true });
    // qt.put(bbox);

  }

  return {
    node
  }
}
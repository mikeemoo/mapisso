
import { Way, Node } from '../types';
import { Vector2 } from 'three';
import aniron from '../aniron';
import QuadTree from 'simple-quadtree';
import { bounds, expandBounds, centerBounds, translateBounds, boundsOverlap, rotateAll, split, fill } from '../utils';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';

const loader = new FontLoader();
const font = loader.parse(aniron);

export default (qt: QuadTree, lineWidth: number, zoomMultiplier: number, labelSizes: { [k: string]: number }, border: number, pageWidth: number, pageHeight: number) => {

  const labels: { text: string; size: number; center: Vector2 }[] = [];

  const way = (way: Way, includeWoods: boolean) => {

    const woodsWithName = (way.tags.landuse === 'forest' || way.tags.natural === 'wood') && way.tags.name && !includeWoods;
    if (!woodsWithName) {
      return;
    }

    const points = way.nodes.map((node) => node.position);

    const bbox = bounds([points], {})

    labels.push({
      text: way.tags.name,
      size: labelSizes['wood'] * zoomMultiplier,
      center: new Vector2(bbox.x + (bbox.w / 2), bbox.y + (bbox.h / 2))
    })

  }

  const node = (node: Node) => {
    const placeWithName = node.tags.place && node.tags.name;
    if (!placeWithName) {
      return;
    }
    console.log(node.ways);
    labels.push({
      text: node.tags.name,
      size: (labelSizes[node.tags?.place] || labelSizes['wood']) * zoomMultiplier,
      center: node.position
    });
  }

  const post = () => {
    
    console.log('labels.post');

    const labelsWithBounds = labels.map(({ text, size, center }) => {

      let shapes = font.generateShapes(text, size)
        .map((_shape) => {
          const { shape, holes } = _shape.extractPoints(4);
          const translatedHoles = holes.map((hole) => hole.map((v) => new Vector2(v.x + center.x, -v.y + center.y)));
          return {
            shell: shape.map((v) => new Vector2(v.x + center.x, -v.y + center.y)),
            holes: translatedHoles
          };
        }).flat();

      const tmpBounds = bounds(shapes.map(({ shell }) => shell), {});
      const shiftVector = new Vector2(-tmpBounds.w / 2, -tmpBounds.h / 2);
      shapes.forEach(({ shell, holes }) => {
        shell.forEach((point) => point.add(shiftVector));
        holes.forEach((hole) => hole.forEach((point) => point.add(shiftVector)));
      });
      const tmpBounds2 = bounds(shapes.map(({ shell }) => shell), {});
      const angle = -0.15 + (Math.random() * 0.3);
      shapes = shapes.map(({ shell, holes }) => ({
        shell: rotateAll([ shell ], centerBounds(tmpBounds2), angle)[0],
        holes: rotateAll(holes, centerBounds(tmpBounds2), angle)
      }));

      const env = expandBounds(bounds(shapes.map(({ shell }) => shell), {}), 3, 3);
      return {
        polygons: shapes,
        env,
        text,
        shift: new Vector2(0, 0)
      }
    });

    let bail = 100;
    while (bail--) {
      let hasOverlaps = false;
      labelsWithBounds.map((label, i) => {
        const center = centerBounds(label.env);
        return labelsWithBounds
          .filter((l) => l !== label && boundsOverlap(l.env, label.env))
          .map((l) => {
            hasOverlaps = true;
            return center.clone().sub(centerBounds(l.env));
          })
          .reduce((acc, v) => acc.add(v), new Vector2(0, 0)).normalize();
      }).forEach((move, i) => {
        labelsWithBounds[i].shift.add(move);
        labelsWithBounds[i].env = translateBounds(labelsWithBounds[i].env, move);
      });
      if (!hasOverlaps) {
        break;
      }
    }

    labelsWithBounds
    .filter(({ env }) => env.x > border && env.maxX < pageWidth - border && env.y > border && env.maxY < pageHeight - border)
    .forEach(({ polygons, shift}, i) => {

      polygons.forEach((polygon) => {
        polygon.shell.forEach((point) => point.add(shift));
        polygon.holes.forEach((hole) => hole.forEach((point) => point.add(shift)));

        const bbox = bounds([ polygon.shell ], {});
        const expanded = expandBounds(bbox, 1, 1);
        qt.get(expanded).forEach((otherBB) => {
          qt.remove(otherBB);
          if (!otherBB.metadata.deleteAll) {
            const newLines = [];
            otherBB.lines.forEach((line) => {
              let currentLine: Vector2[] = null;
              split(line, 1).forEach((point) => {
                if (polygon.shell.every((xp) => ((point.x - xp.x) ** 2) + ((point.y - xp.y) ** 2) >= 2 ** 2)) {
                  if (!currentLine) {
                    currentLine = [];
                  }
                  currentLine.push(point);
                } else {
                  if (currentLine) {
                    newLines.push(currentLine)
                  }
                  currentLine = null;
                }
              });
              if (currentLine) {
                newLines.push(currentLine)
              }
            });
            qt.put(bounds(newLines, {}));
          }
        });
      });

      const lines = fill(polygons, lineWidth);
       qt.put(bounds(lines, { deleteAll: true }));
      
    });

  }

  return {
    way,
    node,
    post
  }
}
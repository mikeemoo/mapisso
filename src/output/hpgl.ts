import { Vector2 } from 'three';
import { bounds } from '../utils';

export default (paperWidth: number, paperHeight: number, lineWidth: number, lines: Vector2[][]) => {

  const remainingLines: Vector2[][] = [];
  lines
    .forEach((line, i) => {
      
      if (i === 0) {
        return;
      }

      remainingLines.push(line);
    });

  // const tree = new kdTree(Array.from(points), (a, b) => {
  //   return ((b.x - a.x) ** 2) + ((b.y - a.y) ** 2);
  // }, ['x', 'y']);


  const path = [lines[0]];

  while (remainingLines.length > 0) {
    const latestPath = path[path.length - 1];
    const latestPoint = latestPath[latestPath.length - 1];
    const mapped = remainingLines.map((line) => ({
      line,
      d1: ((line[0].x - latestPoint.x) ** 2) + ((line[0].y - latestPoint.y) ** 2),
      d2: ((line[line.length - 1].x - latestPoint.x) ** 2) + ((line[line.length - 1].y - latestPoint.y) ** 2),
    }));
    mapped.sort((a, b) => Math.min(a.d1, a.d2) - Math.min(b.d1, b.d2));
    const distance = Math.min(mapped[0].d2, mapped[0].d1);
    const closest = mapped[0].line;
    remainingLines.splice(remainingLines.indexOf(closest), 1);
    if (mapped[0].d2 < mapped[0].d1) {
      closest.reverse();
    }
    if (distance < (lineWidth / 2) ** 2) {
      latestPath.push(...closest);
    } else {
      path.push(closest);
    }
  }

  const bbox = bounds(path, {});

  const mX = Math.round(40 * bbox.maxX);
  const mY = Math.round(40 * bbox.maxY);

  console.log(`IN;PU0,0,0,${mX},${mY},${mX},${mY},0,0,0;`);

  let output = 'IN;';
  
  path.forEach((line) => {
    line.forEach((point, i) => {
      const coord = `${[Math.round(point.y * 40)]},${Math.round(point.x * 40)}`;
      if (i === 0) {
        output += `PU${coord};PD`;
      } else {
        output += `${coord},`;
      }
    });
    output = output.slice(0, -1);
    output += ';';
  });
  output += ';PU0,0;';
  console.log(output);
}
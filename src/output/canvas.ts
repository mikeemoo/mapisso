import { Vector2 } from 'three';

export default (canvas: HTMLCanvasElement, paperWidth: number, paperHeight: number, lineWidth: number, width: number, lines: Vector2[][]) => {

  canvas.width = width;
  canvas.height = width * (paperHeight / paperWidth);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgb(213, 202, 174)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const scale = width / paperWidth;

  
  ctx.beginPath();
  ctx.lineWidth = lineWidth * scale;
  
  lines.forEach((points) => {
    points.forEach((point, i) => {
      if (i === 0) {
        ctx.moveTo(point.x * scale, point.y * scale);
      } else {
        ctx.lineTo(point.x * scale, point.y * scale);
      }
    });
  });
  ctx.stroke();
}

import { Way } from '../types';
import { Vector2 } from 'three';
import QuadTree from 'simple-quadtree';
import { pointFinder, bounds, distanceToPointSq } from '../utils';

const fromAngle = (angle: number, magnitude: number) => new Vector2(magnitude * Math.cos(angle), magnitude * Math.sin(angle));

const createHouse = (x: number, _y: number, wallHeight: number, roofHeight: number, width: number, depth: number, minDoorHeight: number, doorOnLeft: boolean) => {

  const heightAdjust = (wallHeight + roofHeight)/2;
  const y = _y + heightAdjust;
  const depthVector = fromAngle(-0.2, depth);
  const wallVector = new Vector2(0, wallHeight);
  const widthVector = fromAngle(Math.PI + 0.2, width);
  const roofVector = new Vector2(0, roofHeight);

  const bottomRightCorner = new Vector2(x, y);
  const topRightCorner = bottomRightCorner.clone().sub(wallVector);
  const farTopRightCorner = topRightCorner.clone().add(depthVector.clone().multiplyScalar(0.9));
  const farBottomRightCorner =  farTopRightCorner.clone().add(wallVector);
  const bottomLeftCorner = bottomRightCorner.clone().add(widthVector);
  const topLeftCorner = bottomLeftCorner.clone().sub(wallVector);
  const roofPeakVector = topRightCorner.clone().sub(topLeftCorner).multiplyScalar(0.5);
  const frontRoof = topLeftCorner.clone().add(roofPeakVector).sub(roofVector);
  const backRoof = farTopRightCorner.clone().sub(roofVector).sub(roofPeakVector)
  const doorVec = bottomRightCorner.clone().sub(bottomLeftCorner);
  const doorStart = bottomLeftCorner.clone().add(doorVec.clone().multiplyScalar(0.4));
  const doorEnd = bottomLeftCorner.clone().add(doorVec.clone().multiplyScalar(0.6));

  const xDepth = fromAngle(Math.PI + 0.2, depth);
  const farTopLeftCorner = topRightCorner.clone().add(xDepth.clone().multiplyScalar(0.9));
  const farBottomLeftCorner = farTopLeftCorner.clone().add(wallVector);
  const xBottomRightCorner = bottomRightCorner.clone().add(fromAngle(-0.2, width));
  const xTopRightCorner = xBottomRightCorner.clone().sub(wallVector);
  const xRoofPeakVector = xTopRightCorner.clone().sub(topRightCorner).multiplyScalar(0.5);
  const xFrontRoof = topRightCorner.clone().add(xRoofPeakVector).sub(roofVector);
  const xBackRoof = farTopLeftCorner.clone().sub(roofVector).add(xRoofPeakVector);
  const xDoorVec = xBottomRightCorner.clone().sub(bottomRightCorner);
  const xDoorStart = bottomRightCorner.clone().add(xDoorVec.clone().multiplyScalar(0.4));
  const xDoorEnd = bottomRightCorner.clone().add(xDoorVec.clone().multiplyScalar(0.6));

  const doorHeightVector = new Vector2(wallVector.x, Math.max(minDoorHeight, wallVector.y * 0.5));

  return doorOnLeft ? [
    [
      bottomRightCorner,
      topRightCorner,
      farTopRightCorner,
      farBottomRightCorner,
      bottomRightCorner,
      bottomLeftCorner,
      topLeftCorner,
      frontRoof,
      topRightCorner
    ],
    [
      frontRoof,
      backRoof,
      topRightCorner.clone().add(depthVector),
      topRightCorner
    ],
    [
      doorStart,
      doorStart.clone().sub(doorHeightVector),
      doorEnd.clone().sub(doorHeightVector),
      doorEnd
    ]
  ] : [
    [
      bottomRightCorner,
      topRightCorner,
      farTopLeftCorner,
      farBottomLeftCorner,
      bottomRightCorner,
      xBottomRightCorner,
      xTopRightCorner,
      xFrontRoof,
      topRightCorner,
    ],
    [
      xFrontRoof,
      xBackRoof,
      topRightCorner.clone().add(xDepth),
      topRightCorner
    ],
    [
      xDoorStart,
      xDoorStart.clone().sub(doorHeightVector),
      xDoorEnd.clone().sub(doorHeightVector),
      xDoorEnd
    ]
  ];
}

export default function houses(qt: QuadTree, lineWidth: number, zoomMultiplier: number) {

  const housePolys: Vector2[][] = [];

  function way(way: Way) {

    if (way.tags?.landuse !== 'residential') {
      return;
    }

    const coords = way.nodes.map((node) => node.position);
    housePolys.push(coords);
  }

  function post() {

    console.log('houses.post');

    if (housePolys.length === 0) {
      return;
    }

    const roadDistance = 2.5;
    const radius = 3.5;

    const findPoint = pointFinder(housePolys);

    let missesInARow = 0;

    for (let i = 0; i < 10000; i++) {
      const point = findPoint();

      const bbox = bounds([[
        new Vector2(point.x - radius, point.y - radius),
        new Vector2(point.x + radius, point.y + radius),
      ]], {});

      const nearby = qt.get(bbox).filter(
        ({ lines }) => lines.some((line) => distanceToPointSq(line, point) < (radius ** 2))
      );

      const nearbyRoads = nearby.filter((item) => item.metadata.type == 'road');

      const nearbyOtherCount = nearby.length - nearbyRoads.length;

      if (nearbyRoads.length > 0 && nearbyOtherCount === 0 && nearbyRoads.every(({ lines }) => lines.every((line) => distanceToPointSq(line, point) > (roadDistance ** 2)))) {
        
        const sM = 0.5;

        const wH = ((2 * Math.random()) + 1) * sM;
        const rH = ((2 * Math.random()) + 1) * sM;

        const doorOnLeft = nearbyRoads[0].x < point.x;

        const lines = createHouse(
          point.x,
          point.y,
          wH,
          rH,
          ((1.5 * Math.random()) + 2) * sM,
          ((1.5 * Math.random()) + 2) * sM,
          Math.min(2, wH + ((rH - wH) / 2)),
          doorOnLeft
        )

        qt.put(bounds(lines, { deleteAll: true}));

      }

    }


  }

  return {
    way,
    post
  }
}
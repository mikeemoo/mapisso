import { Vector2 } from 'three';
import canvas from './output/canvas';
import hpgl from './output/hpgl';
import QuadTree from 'simple-quadtree';
import { getData } from './loader';
import initRoads from './elements/roads';
import initRailways from './elements/railways';
import initRivers from './elements/rivers';
import initStreams from './elements/streams';
import initCrops from './elements/crops';
import initTrees from './elements/trees';
import initHouses from './elements/houses';
import initLabels from './elements/labels';
import initCoast from './elements/coast';
import initTerrain from './elements/terrain';
import * as L from 'leaflet';
import { split, thicken } from './utils';

const paperWidth = 392;
const paperHeight = 294;
const penWidth = 0.2;

const mapDiv = document.getElementById('map');
mapDiv.style.width = `${paperWidth * 2}px`;
mapDiv.style.height = `${paperHeight * 2}px`;
const map = new L.map('map', {
  center: [51.07644816696379, -4.054126765523718],
  zoom: 13,
  zoomSnap: 0,
  minZoom: 13
});

map.addLayer(new L.TileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"));

document.getElementById('generate').addEventListener('click', async (e) => {

  const zoomMultiplier =  1 + ((map.getZoom() - 13) / 5);
  console.log(zoomMultiplier);
  const roadTypes = {
    motorway: 7,
    motorway_link: 7,
    trunk: 5,
    primary: 4,
    primary_link: 4,
    secondary: 3,
    secondary_link: 3,
    tertiary: 1.5,
    tertiary_link: 1.5,
    ...(zoomMultiplier > 1.35 ? {
      residential: 1,
      unclassified: 1,
      living_street: 1,
      road: 1
    } : {})
  }

  const labelSizes =  {
    city:       10,
    town:       8,
    village:    3,
    suburb:     1.5,
    hamlet:     2,
    locality:   1,
    farm:       1,
    wood:       1
  }

  const railwayThickness = 2;
  const streamThickness = 1;
  const border = 10;
  
  const { nodes, ways } = await getData(map.getBounds(), paperWidth);

  const qt = QuadTree(0, 0, paperWidth, paperHeight);

  // initialisation
  const roads    = initRoads    (qt, penWidth, zoomMultiplier);
  const railways = initRailways (qt, penWidth, zoomMultiplier);
  const rivers   = initRivers   (qt, penWidth, zoomMultiplier);
  const streams  = initStreams  (qt, penWidth, zoomMultiplier);
  const crops    = initCrops    (qt, penWidth, zoomMultiplier);
  const trees    = initTrees    (qt, penWidth, zoomMultiplier);
  const houses   = initHouses   (qt, penWidth, zoomMultiplier);
  const labels   = initLabels   (qt, penWidth, zoomMultiplier, labelSizes, border, paperWidth, paperHeight);
  const coast    = initCoast    (qt, penWidth, zoomMultiplier);
  // const terrain  = initTerrain  (qt, penWidth);

  // deal with ways
  ways.forEach((way) => {
    roads.way(way, roadTypes);
    railways.way(way, railwayThickness);
    rivers.way(way);
    coast.way(way);
    streams.way(way, streamThickness);
    houses.way(way);
    crops.way(way);
    trees.way(way);
    labels.way(way, false);
  });

  // deal with nodes
  nodes.forEach((node) => {
    labels.node(node);
    // terrain.node(node);
  })

  // perform any post processing
  rivers.post();
  houses.post();
  crops.post();
  trees.post();
  labels.post();

  // grab everything out of the quad tree
  const shapes = qt.get({
    x: -100,
    y: -100,
    w: paperWidth + 100,
    h: paperWidth + 100
  });

  const allLines = [];

  // Icky way of removing anything that falls outside of the borders of the page. We find any shapes that don't fit entirely within the borders,
  // then break their lines into much smaller parts, then split off any chunks that fall outside of the borders.
  shapes.forEach((shape) => {
    if (shape.x < border || shape.maxX > paperWidth - border || shape.y < border || shape.maxY > paperHeight - border) {
      if (!shape.metadata.deleteAll) {
        const lines = [];
        shape.lines.forEach((line) => {
          let currentLine: Vector2[] | null = null;
          split(line, 0.5).forEach((point) => {
            if (point.x > border && point.x < paperWidth - border && point.y > border && point.y < paperHeight - border) {
              if (!currentLine) {
                currentLine = [];
                lines.push(currentLine);
              }
              currentLine.push(point);
            } else {
              currentLine = null;
            }
          })
        })
        allLines.push(...lines);
      }
    } else {
      allLines.push(...shape.lines);
    }
  });

  // finally draw some borders. A thin line, then a thicker line. I dont know why.
  allLines.push(
    [
      new Vector2(border, border),
      new Vector2(paperWidth - border, border),
      new Vector2(paperWidth - border, paperHeight - border),
      new Vector2(border, paperHeight - border),
      new Vector2(border, border),
    ],
    ...thicken([
      new Vector2(3, 3),
      new Vector2(paperWidth - 3, 3),
      new Vector2(paperWidth - 3, paperHeight - 3),
      new Vector2(3, paperHeight - 3),
      new Vector2(3, 3),
    ], penWidth, penWidth * 5)
  );
  e.preventDefault();

  canvas(
    document.getElementById('output') as HTMLCanvasElement,
    paperWidth,
    paperHeight,
    penWidth,
    window.innerWidth,
    allLines
  );

  hpgl(paperWidth, paperHeight, penWidth, allLines);
  return false;
});
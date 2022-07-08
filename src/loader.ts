import { Vector2 } from 'three';
import { geoMercator } from 'd3-geo';
import { Coord, Node, Way, Relation } from './types';

export const getData = async (bounds: any, paperWidthMM: number) => {
  const boundingBox = [bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast()];
  const queryString = `[timeout:900][maxsize:1073741824][bbox:${boundingBox.join(
    ","
  )}][out:json];
(
    relation;
    >;
    way;
    >;
    node;
);
out body;`;

  const data = await (
    await fetch("https://overpass.kumi.systems/api/interpreter", {
      method: "post",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
      },
      body: `data=${encodeURIComponent(queryString)}`
    })
  ).json();

  const centre = bounds.getCenter();

  const projector = geoMercator();
  projector.center([centre.lng, centre.lat]).scale(6371393);
  const tl = projector([bounds.getWest(), bounds.getNorth()]);
  const br = projector([bounds.getEast(), bounds.getSouth()]);
  console.log(centre);

  const width = br[0] - tl[0];
  const scale = paperWidthMM / width;

  const nodes = new Map<number, Node>();
  const ways = new Map<number, Way>();
  const relations = new Map<number, Relation>();

  let coords: [number, number] = [0, 0];
  const relationMap = new Map<number, Relation[]>();
  const wayMap = new Map<number, Way[]>();
  data.elements.forEach((elem) => {
    elem.tags = elem.tags || {};
    if (elem.type === "node") {
      coords[0] = elem.lon;
      coords[1] = elem.lat;
      const [x, y] = projector(coords);
      elem.position = new Vector2(
        (x - tl[0]) * scale,
        (y - tl[1]) * scale
      )
      elem.relations = [];
      elem.ways = wayMap.get(elem.id) || [];
      elem.relations = relationMap.get(elem.id) || [];
      nodes.set(elem.id, elem);
    } else if (elem.type === "way") {
      const nodeIds = elem.nodes as unknown as number[];
      elem.nodes = [];
      nodeIds.forEach((nodeId) => {
        const node = nodes.get(nodeId);
        if (node) {
          node.ways.push(elem);
        }
        elem.nodes.push(node);
        const m = wayMap.get(nodeId) || [];
        m.push(elem);
        wayMap.set(nodeId, m);
      })
      elem.relations = relationMap.get(elem.id) || [];
      ways.set(elem.id, elem);
    } else if (elem.type === "relation") {
      relations.set(elem.id, elem);
      elem.members.forEach((member) => {
        if (member.type === 'node') {
          const node = nodes.get(member.ref);
          if (node) {
            node.relations.push(elem);
          }
          member.element = node;
        } else if (member.type === 'way') {
          const way = ways.get(member.ref);
          if (way) {
            way.relations.push(elem);
          }
          member.element = way;
        }
        const m = relationMap.get(member.ref) || [];
        m.push(elem);
        relationMap.set(member.ref, m);

      });
    }
  });

  return { nodes, ways, relations };
}
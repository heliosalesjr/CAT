/**
 * The destinations the headline cycles through.
 *
 * `pan` and `scale` position the hero's contour field so the map
 * travels to each place instead of cutting to it — the whole point of
 * the animation is that these are all one world, seen from different
 * points over it. Values are in the terrain's own 1200x800 space.
 */
export type City = {
  name: string;
  cc: string;
  coords: string;
  pan: [number, number];
  scale: number;
};

export const CITIES: readonly City[] = [
  { name: "Seoul",       cc: "KR", coords: "37.5665° N · 126.9780° E", pan: [-140,  -60], scale: 1.18 },
  { name: "Shanghai",    cc: "CN", coords: "31.2304° N · 121.4737° E", pan: [ 120,   40], scale: 1.32 },
  { name: "Bogotá",      cc: "CO", coords: "04.7110° N ·  74.0721° W", pan: [ -60,  110], scale: 1.24 },
  { name: "Accra",       cc: "GH", coords: "05.6037° N ·  00.1870° W", pan: [ 180,  -90], scale: 1.40 },
  { name: "Barcelona",   cc: "ES", coords: "41.3874° N ·  02.1686° E", pan: [ -10,  -30], scale: 1.12 },
  { name: "Beijing",     cc: "CN", coords: "39.9042° N · 116.4074° E", pan: [  60,  130], scale: 1.28 },
  { name: "Ho Chi Minh", cc: "VN", coords: "10.7769° N · 106.7009° E", pan: [-180,   70], scale: 1.22 },
];

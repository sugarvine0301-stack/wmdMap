import type maplibregl from "maplibre-gl";
import type { GeolocationCoords } from "@/hooks/use-geolocation";

const POINT_SOURCE = "user-location-point";
const CONE_SOURCE = "user-location-cone";
const ACCURACY_LAYER = "user-location-accuracy";
const CONE_LAYER = "user-location-cone";
const DOT_LAYER = "user-location-dot";

const DEFAULT_ACCURACY_M = 25;
const MIN_HALO_PX = 28;
const MAX_HALO_PX = 140;
const CONE_LENGTH_M = 22;
const CONE_HALF_ANGLE_DEG = 35;

function metersToPixels(meters: number, lat: number, zoom: number): number {
  const mpp =
    (40075016.686 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom + 8);
  if (!Number.isFinite(mpp) || mpp <= 0) return MIN_HALO_PX;
  return meters / mpp;
}

function haloRadiusPx(position: GeolocationCoords, zoom: number): number {
  const meters =
    Number.isFinite(position.accuracy) && position.accuracy > 0
      ? position.accuracy
      : DEFAULT_ACCURACY_M;
  return Math.min(
    MAX_HALO_PX,
    Math.max(MIN_HALO_PX, metersToPixels(meters, position.latitude, zoom))
  );
}

function destination(
  lng: number,
  lat: number,
  bearingDeg: number,
  distanceM: number
): [number, number] {
  const R = 6378137;
  const br = (bearingDeg * Math.PI) / 180;
  const latR = (lat * Math.PI) / 180;
  const lngR = (lng * Math.PI) / 180;
  const d = distanceM / R;
  const lat2 = Math.asin(
    Math.sin(latR) * Math.cos(d) + Math.cos(latR) * Math.sin(d) * Math.cos(br)
  );
  const lng2 =
    lngR +
    Math.atan2(
      Math.sin(br) * Math.sin(d) * Math.cos(latR),
      Math.cos(d) - Math.sin(latR) * Math.sin(lat2)
    );
  return [(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI];
}

function conePolygon(
  position: GeolocationCoords,
  heading: number,
  mapBearing: number
): GeoJSON.Feature<GeoJSON.Polygon> {
  const { longitude: lng, latitude: lat } = position;
  const center = heading - mapBearing;
  const ring: [number, number][] = [[lng, lat]];
  const steps = 24;
  for (let i = 0; i <= steps; i += 1) {
    const b =
      center -
      CONE_HALF_ANGLE_DEG +
      ((CONE_HALF_ANGLE_DEG * 2 * i) / steps);
    ring.push(destination(lng, lat, b, CONE_LENGTH_M));
  }
  ring.push([lng, lat]);
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [ring] },
    properties: {},
  };
}

function emptyCollection(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

export function ensureUserLocationLayers(map: maplibregl.Map): void {
  if (map.getSource(POINT_SOURCE)) return;

  map.addSource(POINT_SOURCE, {
    type: "geojson",
    data: emptyCollection(),
  });
  map.addSource(CONE_SOURCE, {
    type: "geojson",
    data: emptyCollection(),
  });

  map.addLayer({
    id: ACCURACY_LAYER,
    type: "circle",
    source: POINT_SOURCE,
    paint: {
      "circle-radius": MIN_HALO_PX,
      "circle-color": "rgba(125, 211, 252, 0.38)",
      "circle-blur": 0.12,
      "circle-stroke-width": 1,
      "circle-stroke-color": "rgba(255, 255, 255, 0.5)",
    },
  });

  map.addLayer({
    id: CONE_LAYER,
    type: "fill",
    source: CONE_SOURCE,
    paint: {
      "fill-color": "#38bdf8",
      "fill-opacity": 0.4,
    },
  });

  map.addLayer({
    id: DOT_LAYER,
    type: "circle",
    source: POINT_SOURCE,
    paint: {
      "circle-radius": 7,
      "circle-color": "#0891b2",
      "circle-stroke-width": 2.5,
      "circle-stroke-color": "#ffffff",
    },
  });
}

export function updateUserLocationOnMap(
  map: maplibregl.Map,
  position: GeolocationCoords | null,
  heading: number | null
): void {
  if (!map.isStyleLoaded()) return;

  try {
    ensureUserLocationLayers(map);
  } catch (e) {
    console.error("[map-user-location] failed to add layers", e);
    return;
  }

  const pointSource = map.getSource(POINT_SOURCE) as maplibregl.GeoJSONSource;
  const coneSource = map.getSource(CONE_SOURCE) as maplibregl.GeoJSONSource;
  if (!pointSource || !coneSource) return;

  if (!position) {
    pointSource.setData(emptyCollection());
    coneSource.setData(emptyCollection());
    return;
  }

  pointSource.setData({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [position.longitude, position.latitude],
        },
        properties: {},
      },
    ],
  });

  if (map.getLayer(ACCURACY_LAYER)) {
    map.setPaintProperty(
      ACCURACY_LAYER,
      "circle-radius",
      haloRadiusPx(position, map.getZoom())
    );
  }

  if (heading == null) {
    coneSource.setData(emptyCollection());
    return;
  }

  coneSource.setData({
    type: "FeatureCollection",
    features: [conePolygon(position, heading, map.getBearing())],
  });
}

export function removeUserLocationFromMap(map: maplibregl.Map): void {
  for (const id of [DOT_LAYER, CONE_LAYER, ACCURACY_LAYER]) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  for (const id of [CONE_SOURCE, POINT_SOURCE]) {
    if (map.getSource(id)) map.removeSource(id);
  }
}

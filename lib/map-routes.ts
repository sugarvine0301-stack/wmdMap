import type maplibregl from "maplibre-gl";
import routesGeoJson from "@/data/wmdmap-routes.json";

export const ROUTES_SOURCE_ID = "wmdmap-routes";
export const ROUTES_LAYER_ID = "wmdmap-routes-line";

const routesData = routesGeoJson as GeoJSON.FeatureCollection;

export function ensureRouteLayers(map: maplibregl.Map): void {
  if (map.getSource(ROUTES_SOURCE_ID)) return;
  if (!map.isStyleLoaded()) return;

  map.addSource(ROUTES_SOURCE_ID, {
    type: "geojson",
    data: routesData,
  });

  map.addLayer({
    id: ROUTES_LAYER_ID,
    type: "line",
    source: ROUTES_SOURCE_ID,
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
    paint: {
      "line-color": "#ef4444",
      "line-width": 3.5,
      "line-opacity": 0.92,
    },
  });
}

export function removeRouteLayers(map: maplibregl.Map): void {
  if (map.getLayer(ROUTES_LAYER_ID)) map.removeLayer(ROUTES_LAYER_ID);
  if (map.getSource(ROUTES_SOURCE_ID)) map.removeSource(ROUTES_SOURCE_ID);
}

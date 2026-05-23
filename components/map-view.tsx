"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getSpotPinColor, resolveSpotImageUrl } from "@/lib/spots";
import { appUi } from "@/lib/ui";
import type { Spot } from "@/lib/supabase";

const CENTER: [number, number] = [127.368, 36.1254];
const DEFAULT_ZOOM = 15;
const FOCUS_ZOOM = 17;
const PANEL_TRANSITION_MS = 320;

const BASEMAP_TILES: Record<"standard" | "satellite", string[]> = {
  standard: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
  satellite: ["https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"],
};

type Basemap = keyof typeof BASEMAP_TILES;

export type MapFocusRequest = {
  spotId: string;
  latitude: number;
  longitude: number;
  key: string | number;
};

type MapViewProps = {
  active: boolean;
  spots: Spot[];
  focusRequest: MapFocusRequest | null;
  isMobile: boolean;
  clearSelectionSignal?: number;
  onSelectedSpotChange?: (spot: Spot | null) => void;
  onFocusComplete?: () => void;
};

type MarkerEntry = {
  marker: maplibregl.Marker;
  element: HTMLElement;
  spot: Spot;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const PIN_VIEWBOX_WIDTH = 32;
const PIN_VIEWBOX_HEIGHT = 40;
/** 尖ったしずく（先端は viewBox 下端中央）— 表示のみ横幅をやや広げる */
const PIN_WIDTH = 26;
const PIN_HEIGHT = 30;
const PIN_TIP_X = PIN_VIEWBOX_WIDTH / 2;
const PIN_TIP_Y = PIN_VIEWBOX_HEIGHT;

const PIN_BODY_PATH = `M${PIN_TIP_X} 2C9.4 2 5 6.6 5 12.1C5 17.4 ${PIN_TIP_X} ${PIN_TIP_Y} ${PIN_TIP_X} ${PIN_TIP_Y}C${PIN_TIP_X} ${PIN_TIP_Y} 27 17.4 27 12.1C27 6.6 22.6 2 ${PIN_TIP_X} 2Z`;

const PIN_HOLE_CX = PIN_TIP_X;
const PIN_HOLE_CY = 11.5;
const PIN_HOLE_R = 4.8;

function createMarkerElement(color: string, isSelected: boolean): HTMLElement {
  const element = document.createElement("div");
  element.className = "spot-pin-marker";
  element.style.width = `${PIN_WIDTH}px`;
  element.style.height = `${PIN_HEIGHT}px`;
  element.style.cursor = "pointer";
  element.style.pointerEvents = "auto";
  element.style.lineHeight = "0";
  element.style.transformOrigin = "50% 100%";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${PIN_VIEWBOX_WIDTH} ${PIN_VIEWBOX_HEIGHT}`);
  svg.setAttribute("width", String(PIN_WIDTH));
  svg.setAttribute("height", String(PIN_HEIGHT));
  svg.setAttribute("aria-hidden", "true");
  svg.style.display = "block";
  svg.style.overflow = "hidden";
  svg.style.filter = "none";

  const body = document.createElementNS("http://www.w3.org/2000/svg", "path");
  body.setAttribute("class", "pin-body");
  body.setAttribute("d", PIN_BODY_PATH);
  body.setAttribute("fill", color);
  applyPinStrokeStyle(body, isSelected);

  const hole = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  hole.setAttribute("class", "pin-hole");
  hole.setAttribute("cx", String(PIN_HOLE_CX));
  hole.setAttribute("cy", String(PIN_HOLE_CY));
  hole.setAttribute("r", String(PIN_HOLE_R));
  hole.setAttribute("fill", "#ffffff");

  svg.appendChild(body);
  svg.appendChild(hole);
  element.appendChild(svg);
  return element;
}

function applyPinStrokeStyle(path: SVGPathElement, isSelected: boolean) {
  path.setAttribute("stroke", "#ffffff");
  path.setAttribute("stroke-width", isSelected ? "2.5" : "2");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("paint-order", "stroke fill");
}

function setMarkerColor(entry: MarkerEntry, color: string, isSelected: boolean) {
  const body = entry.element.querySelector<SVGPathElement>(".pin-body");
  if (body) {
    body.setAttribute("fill", color);
    applyPinStrokeStyle(body, isSelected);
  }
}

function buildPopupHtml(spot: Spot): string {
  const imageUrl = resolveSpotImageUrl(spot.image_url);
  const name = escapeHtml(spot.name);
  const description = escapeHtml(
    spot.description?.trim() || "説明文はありません"
  );

  const imageBlock = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="${name}" style="display:block;width:100%;max-height:140px;object-fit:cover;border-radius:8px;margin-bottom:10px;" />`
    : "";

  return `
    <div style="max-width:280px;font-family:system-ui,sans-serif;">
      ${imageBlock}
      <h3 style="margin:0 0 8px;font-size:16px;font-weight:600;color:#18181b;">${name}</h3>
      <p style="margin:0;font-size:13px;line-height:1.55;color:#52525b;max-height:220px;overflow-y:auto;white-space:pre-wrap;">${description}</p>
    </div>
  `;
}

function findSpotForFocus(
  request: MapFocusRequest,
  spots: Spot[]
): Spot | undefined {
  const byId = spots.find((spot) => spot.id === request.spotId);
  if (byId) return byId;

  return spots.find(
    (spot) =>
      Math.abs(spot.latitude - request.latitude) < 1e-5 &&
      Math.abs(spot.longitude - request.longitude) < 1e-5
  );
}

export function MapView({
  active,
  spots,
  focusRequest,
  isMobile,
  clearSelectionSignal = 0,
  onSelectedSpotChange,
  onFocusComplete,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersBySpotIdRef = useRef<Map<string, MarkerEntry>>(new Map());
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const isMobileRef = useRef(isMobile);
  const [basemap, setBasemap] = useState<Basemap>("satellite");
  const [mapReady, setMapReady] = useState(false);
  const [activeSpotId, setActiveSpotId] = useState<string | null>(null);

  isMobileRef.current = isMobile;

  const updateMarkerColors = useCallback((selectedId: string | null) => {
    for (const [spotId, entry] of markersBySpotIdRef.current) {
      const isSelected = spotId === selectedId;
      const color = getSpotPinColor(entry.spot, isSelected);
      setMarkerColor(entry, color, isSelected);
    }
  }, []);

  const closePopup = useCallback(() => {
    popupRef.current?.remove();
    popupRef.current = null;
  }, []);

  const openDesktopPopup = useCallback(
    (spot: Spot, map: maplibregl.Map) => {
      closePopup();
      const popup = new maplibregl.Popup({
        offset: 21,
        maxWidth: "300px",
        closeButton: true,
        closeOnClick: false,
        className: "hidden md:block",
      })
        .setLngLat([spot.longitude, spot.latitude])
        .setHTML(buildPopupHtml(spot))
        .addTo(map);

      popup.on("close", () => {
        setActiveSpotId(null);
        updateMarkerColors(null);
        onSelectedSpotChange?.(null);
        popupRef.current = null;
      });

      popupRef.current = popup;
    },
    [closePopup, onSelectedSpotChange, updateMarkerColors]
  );

  const selectSpot = useCallback(
    (spot: Spot, map: maplibregl.Map) => {
      setActiveSpotId(spot.id);
      updateMarkerColors(spot.id);
      onSelectedSpotChange?.(spot);

      if (isMobileRef.current) {
        closePopup();
      } else {
        openDesktopPopup(spot, map);
      }
    },
    [closePopup, onSelectedSpotChange, openDesktopPopup, updateMarkerColors]
  );

  const clearSelection = useCallback(() => {
    setActiveSpotId(null);
    updateMarkerColors(null);
    closePopup();
    onSelectedSpotChange?.(null);
  }, [closePopup, onSelectedSpotChange, updateMarkerColors]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      center: CENTER,
      zoom: DEFAULT_ZOOM,
      style: {
        version: 8,
        sources: {
          basemap: {
            type: "raster",
            tiles: BASEMAP_TILES.satellite,
            tileSize: 256,
            attribution: "© Google",
          },
        },
        layers: [
          {
            id: "basemap",
            type: "raster",
            source: "basemap",
          },
        ],
      },
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      setMapReady(true);
    });

    map.on("click", () => {
      clearSelection();
    });

    return () => {
      closePopup();
      for (const entry of markersBySpotIdRef.current.values()) {
        entry.marker.remove();
      }
      markersBySpotIdRef.current.clear();
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [clearSelection, closePopup]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    for (const entry of markersBySpotIdRef.current.values()) {
      entry.marker.remove();
    }
    markersBySpotIdRef.current.clear();

    if (spots.length === 0) return;

    for (const spot of spots) {
      const element = createMarkerElement(
        getSpotPinColor(spot, false),
        false
      );

      element.addEventListener("mousedown", (event) => {
        event.stopPropagation();
      });
      element.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectSpot(spot, map);
      });

      const marker = new maplibregl.Marker({
        element,
        anchor: "bottom",
        offset: [0, 0],
      })
        .setLngLat([spot.longitude, spot.latitude])
        .addTo(map);

      markersBySpotIdRef.current.set(spot.id, { marker, element, spot });
    }

  }, [spots, mapReady, selectSpot]);

  useEffect(() => {
    updateMarkerColors(activeSpotId);
  }, [activeSpotId, updateMarkerColors]);

  useEffect(() => {
    if (isMobile) closePopup();
  }, [isMobile, closePopup]);

  useEffect(() => {
    if (clearSelectionSignal > 0) {
      clearSelection();
    }
  }, [clearSelectionSignal, clearSelection]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const source = map.getSource("basemap") as
      | maplibregl.RasterTileSource
      | undefined;
    if (!source) return;

    source.setTiles(BASEMAP_TILES[basemap]);
  }, [basemap, mapReady]);

  useEffect(() => {
    if (!active || !mapRef.current) return;

    const map = mapRef.current;
    const resize = () => map.resize();
    resize();

    const timer = window.setTimeout(resize, PANEL_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [active]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !focusRequest || !active) return;

    const spot = findSpotForFocus(focusRequest, spots);
    if (!spot) {
      onFocusComplete?.();
      return;
    }

    let cancelled = false;

    const runFocus = () => {
      if (cancelled) return;

      map.resize();
      map.flyTo({
        center: [focusRequest.longitude, focusRequest.latitude],
        zoom: FOCUS_ZOOM,
        duration: 1200,
        essential: true,
      });

      const handleMoveEnd = () => {
        if (cancelled) return;
        selectSpot(spot, map);
        onFocusComplete?.();
      };

      map.once("moveend", handleMoveEnd);
    };

    const timer = window.setTimeout(runFocus, PANEL_TRANSITION_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [focusRequest, mapReady, active, spots, onFocusComplete, selectSpot]);

  function toggleBasemap() {
    setBasemap((current) =>
      current === "standard" ? "satellite" : "standard"
    );
  }

  return (
    <div className={appUi.mapFrameOuter}>
      <div className={appUi.mapFrameInner}>
        <div ref={mapContainer} className="h-full w-full" />
        <button
          type="button"
          onClick={toggleBasemap}
          className="absolute right-3 top-3 z-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-md hover:bg-slate-50 md:right-14 md:top-4"
        >
          {basemap === "satellite" ? "通常の地図" : "衛星写真"}
        </button>
      </div>
    </div>
  );
}

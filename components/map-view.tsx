"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { CompassIcon, LayersIcon } from "@/components/map-control-icons";
import {
  useGeolocation,
  type GeolocationCoords,
} from "@/hooks/use-geolocation";
import { getSpotPinColor, resolveSpotImageUrl } from "@/lib/spots";
import { appUi } from "@/lib/ui";
import type { Spot } from "@/lib/supabase";

const CENTER: [number, number] = [127.368, 36.1254];
const DEFAULT_ZOOM = 15;
const FOCUS_ZOOM = 17;
const PANEL_TRANSITION_MS = 320;

/** 地図上のカスタムコントロール（レイヤー・現在地）共通スタイル */
const MAP_CONTROL_BUTTON_CLASS =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/85 text-slate-700 shadow-md backdrop-blur-sm transition-colors hover:bg-white/95 disabled:cursor-not-allowed disabled:opacity-50";

/** ズームボタン（+ / −） */
const MAP_ZOOM_BUTTON_CLASS =
  "flex h-10 w-10 shrink-0 items-center justify-center text-lg font-medium leading-none text-slate-700 transition-colors hover:bg-white/95 disabled:cursor-not-allowed disabled:opacity-50";

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

const USER_LOCATION_DEFAULT_ACCURACY_M = 25;
const USER_LOCATION_MIN_HALO_PX = 28;
const USER_LOCATION_MAX_HALO_PX = 140;

type UserLocationMarkerParts = {
  root: HTMLElement;
  beam: HTMLElement;
};

function accuracyMetersToPixelRadius(
  meters: number,
  latitude: number,
  zoom: number
): number {
  const metersPerPixel =
    (40075016.686 * Math.cos((latitude * Math.PI) / 180)) / Math.pow(2, zoom + 8);
  if (!Number.isFinite(metersPerPixel) || metersPerPixel <= 0) {
    return USER_LOCATION_MIN_HALO_PX;
  }
  return meters / metersPerPixel;
}

function getUserLocationAccuracyRadiusPx(
  position: GeolocationCoords,
  zoom: number
): number {
  const accuracy =
    Number.isFinite(position.accuracy) && position.accuracy > 0
      ? position.accuracy
      : USER_LOCATION_DEFAULT_ACCURACY_M;

  return Math.min(
    USER_LOCATION_MAX_HALO_PX,
    Math.max(
      USER_LOCATION_MIN_HALO_PX,
      accuracyMetersToPixelRadius(accuracy, position.latitude, zoom)
    )
  );
}

const USER_LOCATION_BEAM_HALF_ANGLE_DEG = 32;
const USER_LOCATION_BEAM_LENGTH = 40;
const USER_LOCATION_BEAM_APEX_X = 24;
const USER_LOCATION_BEAM_APEX_Y = 24;

function buildUserLocationBeamConePath(): string {
  const rad = (USER_LOCATION_BEAM_HALF_ANGLE_DEG * Math.PI) / 180;
  const { x: apexX, y: apexY } = {
    x: USER_LOCATION_BEAM_APEX_X,
    y: USER_LOCATION_BEAM_APEX_Y,
  };
  const leftX = apexX - USER_LOCATION_BEAM_LENGTH * Math.sin(rad);
  const leftY = apexY - USER_LOCATION_BEAM_LENGTH * Math.cos(rad);
  const rightX = apexX + USER_LOCATION_BEAM_LENGTH * Math.sin(rad);
  const rightY = apexY - USER_LOCATION_BEAM_LENGTH * Math.cos(rad);

  return `M ${apexX} ${apexY} L ${leftX} ${leftY} A ${USER_LOCATION_BEAM_LENGTH} ${USER_LOCATION_BEAM_LENGTH} 0 0 1 ${rightX} ${rightY} Z`;
}

function createUserLocationMarkerElement(): UserLocationMarkerParts {
  const gradientId = `user-location-beam-gradient-${Math.random().toString(36).slice(2, 9)}`;

  const root = document.createElement("div");
  root.className = "user-location-marker";
  root.style.width = `${USER_LOCATION_MIN_HALO_PX * 2}px`;
  root.style.height = `${USER_LOCATION_MIN_HALO_PX * 2}px`;
  root.style.overflow = "visible";
  root.style.pointerEvents = "none";
  root.setAttribute("aria-hidden", "true");

  const halo = document.createElement("div");
  halo.className = "user-location-marker__halo";

  const beam = document.createElement("div");
  beam.className = "user-location-marker__beam";
  beam.setAttribute("aria-hidden", "true");

  const beamSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  beamSvg.setAttribute("class", "user-location-marker__beam-svg");
  beamSvg.setAttribute("viewBox", "-2 -16 52 52");
  beamSvg.setAttribute("aria-hidden", "true");

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const gradient = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "radialGradient"
  );
  gradient.setAttribute("id", gradientId);
  gradient.setAttribute("cx", "50%");
  gradient.setAttribute("cy", "55%");
  gradient.setAttribute("r", "75%");

  const stopInner = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  stopInner.setAttribute("offset", "0%");
  stopInner.setAttribute("stop-color", "#38bdf8");
  stopInner.setAttribute("stop-opacity", "0.55");

  const stopMid = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  stopMid.setAttribute("offset", "55%");
  stopMid.setAttribute("stop-color", "#7dd3fc");
  stopMid.setAttribute("stop-opacity", "0.28");

  const stopOuter = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  stopOuter.setAttribute("offset", "100%");
  stopOuter.setAttribute("stop-color", "#bae6fd");
  stopOuter.setAttribute("stop-opacity", "0");

  gradient.appendChild(stopInner);
  gradient.appendChild(stopMid);
  gradient.appendChild(stopOuter);
  defs.appendChild(gradient);
  beamSvg.appendChild(defs);

  const cone = document.createElementNS("http://www.w3.org/2000/svg", "path");
  cone.setAttribute("d", buildUserLocationBeamConePath());
  cone.setAttribute("fill", `url(#${gradientId})`);
  beamSvg.appendChild(cone);
  beam.appendChild(beamSvg);

  const dot = document.createElement("div");
  dot.className = "user-location-marker__dot";

  root.appendChild(halo);
  root.appendChild(beam);
  root.appendChild(dot);

  return { root, beam };
}

function updateUserLocationMarkerSize(
  root: HTMLElement,
  position: GeolocationCoords,
  zoom: number
) {
  const diameterPx = getUserLocationAccuracyRadiusPx(position, zoom) * 2;
  root.style.width = `${diameterPx}px`;
  root.style.height = `${diameterPx}px`;
}

function updateUserLocationMarkerHeading(
  beam: HTMLElement,
  heading: number | null,
  mapBearing: number
) {
  if (heading == null) {
    beam.style.opacity = "0";
    beam.style.transform = "rotate(0deg)";
    beam.dataset.heading = "";
    return;
  }

  const rotation = heading - mapBearing;
  beam.style.opacity = "1";
  beam.style.transform = `rotate(${rotation}deg)`;
  beam.dataset.heading = String(Math.round(heading));
  beam.dataset.rotation = String(Math.round(rotation));
}

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
  const userLocationMarkerRef = useRef<maplibregl.Marker | null>(null);
  const userLocationMarkerPartsRef = useRef<UserLocationMarkerParts | null>(
    null
  );
  const hasCenteredOnUserRef = useRef(false);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const isMobileRef = useRef(isMobile);
  const [basemap, setBasemap] = useState<Basemap>("satellite");
  const [mapReady, setMapReady] = useState(false);
  const [activeSpotId, setActiveSpotId] = useState<string | null>(null);

  const {
    position: userPosition,
    loading: geolocationLoading,
    error: geolocationError,
    heading: deviceHeading,
    headingPermission,
    requestHeadingPermission,
    retryLocation,
  } = useGeolocation({ enabled: active });

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

    mapRef.current = map;

    map.on("load", () => {
      setMapReady(true);
    });

    map.on("click", () => {
      clearSelection();
    });

    return () => {
      closePopup();
      userLocationMarkerRef.current?.remove();
      userLocationMarkerRef.current = null;
      userLocationMarkerPartsRef.current = null;
      for (const entry of markersBySpotIdRef.current.values()) {
        entry.marker.remove();
      }
      markersBySpotIdRef.current.clear();
      map.remove();
      mapRef.current = null;
      hasCenteredOnUserRef.current = false;
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !active) return;

    if (!userPosition) {
      userLocationMarkerRef.current?.remove();
      userLocationMarkerRef.current = null;
      userLocationMarkerPartsRef.current = null;
      return;
    }

    const lngLat: [number, number] = [
      userPosition.longitude,
      userPosition.latitude,
    ];

    if (!userLocationMarkerRef.current) {
      const parts = createUserLocationMarkerElement();
      userLocationMarkerPartsRef.current = parts;
      userLocationMarkerRef.current = new maplibregl.Marker({
        element: parts.root,
        anchor: "center",
      })
        .setLngLat(lngLat)
        .addTo(map);
    } else {
      userLocationMarkerRef.current.setLngLat(lngLat);
    }

    const parts = userLocationMarkerPartsRef.current;
    if (!parts) return;

    const syncMarkerLayout = () => {
      updateUserLocationMarkerSize(parts.root, userPosition, map.getZoom());
      updateUserLocationMarkerHeading(
        parts.beam,
        deviceHeading,
        map.getBearing()
      );
    };

    syncMarkerLayout();
    map.on("zoom", syncMarkerLayout);
    map.on("move", syncMarkerLayout);
    map.on("rotate", syncMarkerLayout);

    return () => {
      map.off("zoom", syncMarkerLayout);
      map.off("move", syncMarkerLayout);
      map.off("rotate", syncMarkerLayout);
    };
  }, [userPosition, deviceHeading, mapReady, active]);

  useEffect(() => {
    const parts = userLocationMarkerPartsRef.current;
    const map = mapRef.current;
    if (!parts || !map) return;

    updateUserLocationMarkerHeading(
      parts.beam,
      deviceHeading,
      map.getBearing()
    );
  }, [deviceHeading]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !userPosition || !active) return;
    if (hasCenteredOnUserRef.current || focusRequest) return;

    hasCenteredOnUserRef.current = true;
    map.flyTo({
      center: [userPosition.longitude, userPosition.latitude],
      zoom: DEFAULT_ZOOM,
      duration: 1000,
      essential: true,
    });
  }, [userPosition, mapReady, active, focusRequest]);

  const centerOnUser = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    const target = userPosition ?? (await retryLocation());
    if (!target) return;

    // 方角表示にはユーザ操作が必要（iOS はここでコンパス許可ダイアログが出る）
    await requestHeadingPermission();

    map.flyTo({
      center: [target.longitude, target.latitude],
      zoom: Math.max(map.getZoom(), DEFAULT_ZOOM),
      duration: 800,
      essential: true,
    });
  }, [userPosition, retryLocation, requestHeadingPermission]);

  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn({ duration: 250 });
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut({ duration: 250 });
  }, []);

  function toggleBasemap() {
    setBasemap((current) =>
      current === "standard" ? "satellite" : "standard"
    );
  }

  return (
    <div className={appUi.mapFrameOuter}>
      <div className={appUi.mapFrameInner}>
        <div ref={mapContainer} className="h-full w-full" />
        <div
          className="pointer-events-none absolute right-3 top-3 z-10 flex flex-row items-center gap-2"
          role="group"
          aria-label="地図コントロール"
        >
          <div className="pointer-events-auto flex flex-col gap-2">
            <button
              type="button"
              onClick={toggleBasemap}
              title={
                basemap === "satellite"
                  ? "通常の地図に切り替え"
                  : "衛星写真に切り替え"
              }
              className={MAP_CONTROL_BUTTON_CLASS}
              aria-label={
                basemap === "satellite"
                  ? "通常の地図に切り替え"
                  : "衛星写真に切り替え"
              }
            >
              <LayersIcon />
            </button>
            <button
              type="button"
              onClick={centerOnUser}
              title={
                geolocationError ??
                (headingPermission === "denied"
                  ? "方角の取得が拒否されています。設定でコンパス（モーション）を許可してください"
                  : geolocationLoading
                    ? "現在地を取得中…（タップで再取得）"
                    : deviceHeading == null
                      ? "現在地へ移動（方角表示の許可も求めます）"
                      : "現在地へ移動")
              }
              className={`${MAP_CONTROL_BUTTON_CLASS}${geolocationLoading ? " opacity-70" : ""}`}
              aria-label="現在地へ移動"
              aria-busy={geolocationLoading}
            >
              <CompassIcon />
            </button>
          </div>
          <div className="pointer-events-auto flex flex-col overflow-hidden rounded-lg border border-white/70 bg-white/85 shadow-md backdrop-blur-sm">
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={!mapReady}
              className={`${MAP_ZOOM_BUTTON_CLASS} border-b border-slate-200/50`}
              aria-label="ズームイン"
            >
              +
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={!mapReady}
              className={MAP_ZOOM_BUTTON_CLASS}
              aria-label="ズームアウト"
            >
              −
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

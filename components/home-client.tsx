"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AppNavigation } from "@/components/app-navigation";
import { FigureView } from "@/components/figure-view";
import { ListView } from "@/components/list-view";
import { MapSpotPreviewCard } from "@/components/map-spot-preview-card";
import { MapView, type MapFocusRequest } from "@/components/map-view";
import { SpotDetailModal } from "@/components/spot-detail-modal";
import { TopographyDetailModal } from "@/components/topography-detail-modal";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useSpots } from "@/hooks/use-spots";
import { useTopography } from "@/hooks/use-topography";
import { appUi } from "@/lib/ui";
import type { Spot, Topography } from "@/lib/supabase";

type Tab = "map" | "list" | "figure";

type HomeClientProps = {
  initialSearchParams?: Record<string, string | string[] | undefined>;
};

function getParam(
  params: Record<string, string | string[] | undefined> | undefined,
  key: string
): string | undefined {
  const value = params?.[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseFocusRequest(
  params: Record<string, string | string[] | undefined> | undefined
): MapFocusRequest | null {
  const spotId = getParam(params, "spotId");
  const lat = getParam(params, "lat");
  const lng = getParam(params, "lng");
  if (!spotId || !lat || !lng) return null;

  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    spotId,
    latitude,
    longitude,
    key: spotId,
  };
}

export function HomeClient({ initialSearchParams }: HomeClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();

  const [activeTab, setActiveTab] = useState<Tab>("map");
  const [mapFocusRequest, setMapFocusRequest] = useState<MapFocusRequest | null>(
    () => parseFocusRequest(initialSearchParams)
  );
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [selectedTopography, setSelectedTopography] = useState<Topography | null>(
    null
  );
  const [mapSelectedSpot, setMapSelectedSpot] = useState<Spot | null>(null);
  const [listFocusSpotId, setListFocusSpotId] = useState<string | null>(null);
  const [clearMapSelectionSignal, setClearMapSelectionSignal] = useState(0);
  const { spots, loading, error } = useSpots();
  const {
    topography,
    loading: topographyLoading,
    error: topographyError,
  } = useTopography();

  const clearMapQueryParams = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (
      !params.has("lat") &&
      !params.has("lng") &&
      !params.has("spotId")
    ) {
      return;
    }

    params.delete("lat");
    params.delete("lng");
    params.delete("spotId");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const handleShowOnMap = useCallback(
    (spot: Spot) => {
      setSelectedSpot(null);

      const params = new URLSearchParams();
      params.set("spotId", spot.id);
      params.set("lat", String(spot.latitude));
      params.set("lng", String(spot.longitude));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });

      setMapFocusRequest({
        spotId: spot.id,
        latitude: spot.latitude,
        longitude: spot.longitude,
        key: spot.id,
      });
      setActiveTab("map");
    },
    [pathname, router]
  );

  const handleFocusComplete = useCallback(() => {
    setMapFocusRequest(null);
    clearMapQueryParams();
  }, [clearMapQueryParams]);

  const handleTabChange = useCallback(
    (tab: Tab) => {
      setActiveTab(tab);
      if (tab !== "map") {
        setMapFocusRequest(null);
        setMapSelectedSpot(null);
        clearMapQueryParams();
      }
      if (tab !== "list") {
        setListFocusSpotId(null);
      }
      if (tab !== "figure") {
        setSelectedTopography(null);
      }
    },
    [clearMapQueryParams]
  );

  const handleMapSelectedSpotChange = useCallback((spot: Spot | null) => {
    setMapSelectedSpot(spot);
  }, []);

  const handleOpenMapSpotDetail = useCallback((spot: Spot) => {
    setSelectedSpot(spot);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedSpot(null);
  }, []);

  const isMapDetailOpen =
    activeTab === "map" && selectedSpot !== null && mapSelectedSpot !== null;

  return (
    <div className={`flex h-[100dvh] overflow-hidden ${appUi.pageBg}`}>
      <AppNavigation activeTab={activeTab} onTabChange={handleTabChange} />

      <main className="relative min-h-0 min-w-0 flex-1 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        <section
          aria-hidden={activeTab !== "map"}
          className={panelClass(activeTab === "map")}
        >
          <MapView
            active={activeTab === "map"}
            spots={spots}
            focusRequest={mapFocusRequest}
            isMobile={isMobile}
            clearSelectionSignal={clearMapSelectionSignal}
            onSelectedSpotChange={handleMapSelectedSpotChange}
            onFocusComplete={handleFocusComplete}
          />

          {isMobile && activeTab === "map" && mapSelectedSpot && !isMapDetailOpen ? (
            <MapSpotPreviewCard
              spot={mapSelectedSpot}
              onClose={() => {
                setMapSelectedSpot(null);
                setClearMapSelectionSignal((value) => value + 1);
              }}
              onOpenDetail={handleOpenMapSpotDetail}
            />
          ) : null}
        </section>

        <section
          aria-hidden={activeTab !== "list"}
          className={panelClass(activeTab === "list")}
        >
          <ListView
            spots={spots}
            loading={loading}
            error={error}
            focusSpotId={listFocusSpotId}
            onFocusSpotHandled={() => setListFocusSpotId(null)}
            onShowOnMap={handleShowOnMap}
            onSelectSpot={setSelectedSpot}
          />
        </section>

        <section
          aria-hidden={activeTab !== "figure"}
          className={panelClass(activeTab === "figure")}
        >
          <FigureView
            topography={topography}
            loading={topographyLoading}
            error={topographyError}
            onSelect={setSelectedTopography}
          />
        </section>
      </main>

      {selectedSpot ? (
        <SpotDetailModal
          spot={selectedSpot}
          layout={activeTab === "map" ? "map" : "standard"}
          onClose={handleCloseDetail}
          onShowOnMap={handleShowOnMap}
        />
      ) : null}

      {selectedTopography ? (
        <TopographyDetailModal
          item={selectedTopography}
          onClose={() => setSelectedTopography(null)}
        />
      ) : null}
    </div>
  );
}

function panelClass(visible: boolean) {
  return [
    "absolute inset-0 transition-[opacity,transform] duration-300 ease-out",
    visible
      ? "pointer-events-auto z-10 translate-x-0 opacity-100"
      : "pointer-events-none z-0 translate-x-3 opacity-0",
  ].join(" ");
}


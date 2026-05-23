"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { appUi } from "@/lib/ui";
import {
  getCategoryTagClasses,
  getCategoryTagCountClasses,
  getSpotCategoryLabel,
  groupSpotsByCategory,
  resolveSpotImageUrl,
  SPOT_CATEGORY_LABELS,
  type SpotCategoryLabel,
} from "@/lib/spots";
import type { Spot } from "@/lib/supabase";

type ListViewProps = {
  spots: Spot[];
  loading: boolean;
  error: string | null;
  focusSpotId?: string | null;
  onFocusSpotHandled?: () => void;
  onShowOnMap: (spot: Spot) => void;
  onSelectSpot: (spot: Spot) => void;
};

export function ListView({
  spots,
  loading,
  error,
  focusSpotId,
  onFocusSpotHandled,
  onShowOnMap,
  onSelectSpot,
}: ListViewProps) {
  const grouped = useMemo(() => groupSpotsByCategory(spots), [spots]);
  const [activeCategory, setActiveCategory] =
    useState<SpotCategoryLabel>("木");
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedSpotId, setHighlightedSpotId] = useState<string | null>(
    null
  );
  const listRef = useRef<HTMLUListElement>(null);

  const visibleSpots = useMemo(() => {
    const categorySpots = grouped[activeCategory];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return categorySpots;

    return categorySpots.filter((spot) => {
      const name = spot.name.toLowerCase();
      const description = (spot.description ?? "").toLowerCase();
      return name.includes(query) || description.includes(query);
    });
  }, [activeCategory, grouped, searchQuery]);

  useEffect(() => {
    if (!focusSpotId) return;

    const spot = spots.find((item) => item.id === focusSpotId);
    if (!spot) {
      onFocusSpotHandled?.();
      return;
    }

    const category = getSpotCategoryLabel(spot.category);
    if (activeCategory !== category) {
      setActiveCategory(category);
      return;
    }

    if (!visibleSpots.some((item) => item.id === focusSpotId)) return;

    setHighlightedSpotId(focusSpotId);

    const frame = requestAnimationFrame(() => {
      const row = listRef.current?.querySelector(
        `[data-spot-id="${focusSpotId}"]`
      );
      row?.scrollIntoView({ behavior: "smooth", block: "center" });
      onFocusSpotHandled?.();
    });

    const timer = window.setTimeout(() => {
      setHighlightedSpotId(null);
    }, 2000);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [
    activeCategory,
    focusSpotId,
    onFocusSpotHandled,
    spots,
    visibleSpots,
  ]);

  if (loading) {
    return (
      <div
        className={`flex h-full items-center justify-center ${appUi.pageBg}`}
      >
        <p className={appUi.subtitle}>読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex h-full items-center justify-center ${appUi.pageBg} ${appUi.pagePadding}`}
      >
        <p className="text-center text-red-600">
          データの取得に失敗しました: {error}
        </p>
      </div>
    );
  }

  return (
    <div className={`flex h-full flex-col ${appUi.pageBg}`}>
      <header
        className={`shrink-0 ${appUi.card} mx-4 mt-4 ${appUi.pagePadding} md:mx-6`}
      >
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SPOT_CATEGORY_LABELS.map((label) => {
            const count = grouped[label].length;
            const isActive = activeCategory === label;

            return (
              <button
                key={label}
                type="button"
                onClick={() => setActiveCategory(label)}
                className={[
                  "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  getCategoryTagClasses(label, isActive),
                ].join(" ")}
              >
                {label}
                <span
                  className={[
                    "ml-1.5 rounded-full px-1.5 py-0.5 text-xs",
                    getCategoryTagCountClasses(isActive),
                  ].join(" ")}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative mt-4">
          <label htmlFor="spot-search" className="sr-only">
            スポットを検索
          </label>
          <input
            id="spot-search"
            type="text"
            inputMode="search"
            role="searchbox"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="名前・説明文で検索"
            className={[
              "w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200",
              searchQuery ? "pr-11" : "pr-4",
            ].join(" ")}
            autoComplete="off"
            enterKeyHint="search"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
              aria-label="検索をクリア"
            >
              <span className="text-lg leading-none" aria-hidden>
                ×
              </span>
            </button>
          ) : null}
        </div>
      </header>

      <div
        className={`min-h-0 flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch] ${appUi.tabScrollPadding}`}
      >
        {visibleSpots.length === 0 ? (
          <p className={`text-center ${appUi.subtitle}`}>
            {searchQuery.trim()
              ? `「${searchQuery.trim()}」に一致するスポットはありません`
              : `「${activeCategory}」のスポットはまだありません`}
          </p>
        ) : (
          <ul ref={listRef} className={`flex flex-col ${appUi.stackGap}`}>
            {visibleSpots.map((spot) => (
              <SpotRow
                key={spot.id}
                spot={spot}
                highlighted={highlightedSpotId === spot.id}
                onShowOnMap={onShowOnMap}
                onSelectSpot={onSelectSpot}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SpotRow({
  spot,
  highlighted,
  onShowOnMap,
  onSelectSpot,
}: {
  spot: Spot;
  highlighted: boolean;
  onShowOnMap: (spot: Spot) => void;
  onSelectSpot: (spot: Spot) => void;
}) {
  const imageUrl = resolveSpotImageUrl(spot.image_url);
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !imageFailed;
  const excerpt =
    spot.description?.trim().replace(/\s+/g, " ").slice(0, 80) ||
    "説明文はありません";

  return (
    <li
      data-spot-id={spot.id}
      className={[
        `flex items-center ${appUi.stackGap} ${appUi.card} p-4 transition-colors`,
        highlighted ? "ring-2 ring-slate-300" : "",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => onSelectSpot(spot)}
        className={`flex min-w-0 flex-1 items-center ${appUi.stackGap} text-left`}
      >
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
          {showImage ? (
            <img
              src={imageUrl!}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-slate-400">
              画像なし
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className={appUi.title}>{spot.name}</h3>
          <p className={`mt-1 line-clamp-2 ${appUi.subtitle}`}>
            {excerpt}
            {(spot.description?.length ?? 0) > 80 ? "…" : ""}
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onShowOnMap(spot)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        aria-label={`${spot.name}を地図で表示`}
        title="地図で表示"
      >
        <MapPinIcon />
      </button>
    </li>
  );
}

function MapPinIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M11.54 22.351c.07.06.18.06.25 0C15.64 18.67 21 12.98 21 8.25 21 4.55 17.95 1.5 14.25 1.5c-1.74 0-3.41.69-4.64 1.93L12 3.75l2.39-2.32C13.16 2.19 11.49 1.5 9.75 1.5 6.05 1.5 3 4.55 3 8.25c0 4.73 5.36 10.42 8.54 14.101zM12 10.5a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

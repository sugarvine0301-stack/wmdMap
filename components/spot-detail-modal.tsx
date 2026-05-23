"use client";

import { useEffect, useState } from "react";
import { resolveSpotImageUrl } from "@/lib/spots";
import { appUi } from "@/lib/ui";
import type { Spot } from "@/lib/supabase";

type SpotDetailModalProps = {
  spot: Spot;
  onClose: () => void;
  onShowOnMap: (spot: Spot) => void;
  /** マップタブ時は地図枠と同じ位置・サイズに揃える */
  layout?: "standard" | "map";
};

export function SpotDetailModal({
  spot,
  onClose,
  onShowOnMap,
  layout = "standard",
}: SpotDetailModalProps) {
  const isMapLayout = layout === "map";
  const imageUrl = resolveSpotImageUrl(spot.image_url);
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !imageFailed;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  function handleShowOnMap() {
    onShowOnMap(spot);
    onClose();
  }

  return (
    <div
      className={isMapLayout ? appUi.detailModalRootMap : appUi.detailModalRoot}
      role="dialog"
      aria-modal="true"
      aria-labelledby="spot-detail-title"
    >
      <button
        type="button"
        className={
          isMapLayout ? appUi.detailModalBackdropMap : appUi.detailModalBackdrop
        }
        aria-label="モーダルを閉じる"
        onClick={onClose}
      />

      <div
        className={
          isMapLayout ? appUi.detailModalPanelMap : appUi.detailModalPanel
        }
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <div className="relative bg-zinc-100">
            {showImage ? (
              <img
                src={imageUrl!}
                alt={spot.name}
                className="block w-full object-cover"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center text-sm text-zinc-400">
                画像なし
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
              aria-label="閉じる"
            >
              <CloseIcon />
            </button>
          </div>

          <div className={appUi.pagePadding}>
            <div className={`flex items-center ${appUi.stackGap}`}>
              <h2
                id="spot-detail-title"
                className={`min-w-0 flex-1 break-words ${appUi.title} sm:text-xl`}
              >
                {spot.name}
              </h2>
              <button
                type="button"
                onClick={handleShowOnMap}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white transition hover:bg-zinc-700"
                aria-label="地図で見る"
                title="地図で見る"
              >
                <MapPinIcon />
              </button>
            </div>

            <p
              className={`mt-4 w-full min-w-0 break-words whitespace-pre-wrap ${appUi.subtitle} [overflow-wrap:anywhere]`}
            >
              {spot.description?.trim() || "説明文はありません"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-5 w-5"
      aria-hidden
    >
      <path strokeLinecap="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
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

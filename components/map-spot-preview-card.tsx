"use client";

import { useState } from "react";
import { resolveSpotImageUrl } from "@/lib/spots";
import { appUi } from "@/lib/ui";
import type { Spot } from "@/lib/supabase";

type MapSpotPreviewCardProps = {
  spot: Spot;
  onClose: () => void;
  onOpenDetail: (spot: Spot) => void;
};

export function MapSpotPreviewCard({
  spot,
  onClose,
  onOpenDetail,
}: MapSpotPreviewCardProps) {
  const imageUrl = resolveSpotImageUrl(spot.image_url);
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !imageFailed;
  const excerpt =
    spot.description?.trim().replace(/\s+/g, " ").slice(0, 120) ||
    "説明文はありません";

  function handleOpenDetail() {
    onOpenDetail(spot);
  }

  return (
    <div className="pointer-events-auto absolute inset-x-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] z-20 md:hidden">
      <div
        className={`relative flex items-center gap-3 border border-slate-200 ${appUi.card} p-4 pr-5`}
      >
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
          {showImage ? (
            <img
              src={imageUrl!}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">
              画像なし
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleOpenDetail}
          className="min-w-0 flex-1 text-left active:opacity-70"
          aria-label={`${spot.name}の詳細を見る`}
        >
          <h3 className={`truncate ${appUi.title}`}>{spot.name}</h3>
          <p className={`mt-1 line-clamp-2 ${appUi.subtitle}`}>
            {excerpt}
            {(spot.description?.length ?? 0) > 120 ? "…" : ""}
          </p>
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-white shadow"
          aria-label="閉じる"
        >
          <span className="text-xs leading-none">×</span>
        </button>
      </div>
    </div>
  );
}

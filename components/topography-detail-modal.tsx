"use client";

import { useEffect, useMemo } from "react";
import { TerrainImageList } from "@/components/terrain-image-list";
import { appUi } from "@/lib/ui";
import type { Topography } from "@/lib/supabase";
import {
  extractTopographyImageUrls,
  prepareTerrainDescriptionTextHtml,
} from "@/lib/topography";

type TopographyDetailModalProps = {
  item: Topography;
  onClose: () => void;
};

export function TopographyDetailModal({
  item,
  onClose,
}: TopographyDetailModalProps) {
  const imageUrls = useMemo(() => extractTopographyImageUrls(item), [item]);
  const descriptionHtml = useMemo(
    () => prepareTerrainDescriptionTextHtml(item.description),
    [item.description]
  );

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

  return (
    <div
      className={appUi.detailModalRoot}
      role="dialog"
      aria-modal="true"
      aria-labelledby="topography-detail-title"
    >
      <button
        type="button"
        className={appUi.detailModalBackdrop}
        aria-label="モーダルを閉じる"
        onClick={onClose}
      />

      <div className={appUi.detailModalPanel}>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <div className={`relative ${appUi.pagePadding}`}>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200 sm:right-6 sm:top-6"
              aria-label="閉じる"
            >
              <CloseIcon />
            </button>

            <div className="pr-10 sm:pr-12">
              <h2
                id="topography-detail-title"
                className="text-xl font-semibold text-slate-900 sm:text-2xl"
              >
                {item.name}
              </h2>

              <TerrainImageList
                urls={imageUrls}
                alt={item.name}
                className="mt-4"
              />

              {descriptionHtml ? (
                <div
                  className={`terrain-prose mt-6 ${appUi.subtitle} leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0`}
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                />
              ) : null}
            </div>
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

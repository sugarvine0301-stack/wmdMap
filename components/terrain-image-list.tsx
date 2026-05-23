"use client";

import { useState } from "react";

type TerrainImageListProps = {
  urls: string[];
  alt?: string;
  className?: string;
};

export function TerrainImageList({
  urls,
  alt = "",
  className = "",
}: TerrainImageListProps) {
  const [failedIndices, setFailedIndices] = useState<Set<number>>(
    () => new Set()
  );

  const visibleUrls = urls.filter((_, index) => !failedIndices.has(index));

  if (visibleUrls.length === 0) {
    return (
      <div
        className={`flex aspect-[4/3] items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-400 ${className}`}
      >
        画像なし
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 gap-4 ${className}`}>
      {urls.map((src, index) => {
        if (failedIndices.has(index)) return null;

        return (
          <img
            key={`${src}-${index}`}
            src={src}
            alt={alt}
            onError={() => {
              setFailedIndices((prev) => new Set(prev).add(index));
            }}
            className={[
              "h-auto rounded-xl object-cover",
              index === 0 ? "col-span-2 w-full" : "w-full",
            ].join(" ")}
          />
        );
      })}
    </div>
  );
}

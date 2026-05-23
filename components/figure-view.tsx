"use client";

import { useMemo, useState } from "react";
import { appUi } from "@/lib/ui";
import { extractTopographyImageUrls } from "@/lib/topography";
import type { Topography } from "@/lib/supabase";

type FigureViewProps = {
  topography: Topography[];
  loading: boolean;
  error: string | null;
  onSelect: (item: Topography) => void;
};

function splitTopographyData(topography: Topography[]) {
  const headerData = topography.find((item) => item.no === 0) ?? null;
  const gridData = topography.filter((item) => item.no !== 0);
  return { headerData, gridData };
}

function formatDescriptionExcerpt(
  description: string | null,
  maxLength = 100
): string {
  const text =
    description
      ?.replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim() ?? "";
  if (!text) return "説明文はありません";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}

export function FigureView({
  topography,
  loading,
  error,
  onSelect,
}: FigureViewProps) {
  const { headerData, gridData } = useMemo(
    () => splitTopographyData(topography),
    [topography]
  );

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

  if (topography.length === 0) {
    return (
      <div
        className={`flex h-full items-center justify-center ${appUi.pageBg} ${appUi.pagePadding}`}
      >
        <p className={`text-center ${appUi.subtitle}`}>
          地形データがまだ登録されていません
        </p>
      </div>
    );
  }

  return (
    <div
      className={`h-full overflow-y-auto ${appUi.pageBg} ${appUi.tabScrollPadding} [-webkit-overflow-scrolling:touch]`}
    >
      <div
        className={`mx-auto flex w-full max-w-2xl flex-col ${appUi.stackGap}`}
      >
        {headerData ? <TopographyStaticHeader item={headerData} /> : null}

        {gridData.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {gridData.map((item) => (
              <TopographyGridCard
                key={item.id}
                item={item}
                onSelect={() => onSelect(item)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** no: 0 — クリック不可の静的ヘッダー（タイトル・説明文のみ） */
function TopographyStaticHeader({ item }: { item: Topography }) {
  const description =
    item.description
      ?.replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "説明文はありません";

  return (
    <header className={`${appUi.card} px-4 py-3`} aria-label="地形の概要">
      <h2 className="text-lg font-bold leading-snug text-slate-900">
        {item.name}
      </h2>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
        {description}
      </p>
    </header>
  );
}

function TopographyGridCard({
  item,
  onSelect,
}: {
  item: Topography;
  onSelect: () => void;
}) {
  const imageUrl = extractTopographyImageUrls(item)[0] ?? null;
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !imageFailed;
  const excerpt = formatDescriptionExcerpt(item.description, 72);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex h-full flex-col overflow-hidden text-left transition hover:shadow-lg active:scale-[0.98] active:opacity-95 ${appUi.card}`}
    >
      <div className="relative aspect-square w-full bg-slate-100">
        {showImage ? (
          <img
            src={imageUrl!}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            画像なし
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
          {item.name}
        </h3>
        <p className={`line-clamp-3 flex-1 ${appUi.subtitle} text-xs leading-relaxed`}>
          {excerpt}
        </p>
      </div>
    </button>
  );
}

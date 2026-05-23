import type { Spot } from "@/lib/supabase";

export const SPOT_CATEGORY_LABELS = ["木", "岩", "場所", "地域"] as const;

export type SpotCategoryLabel = (typeof SPOT_CATEGORY_LABELS)[number];

const CATEGORY_MAP: Record<string, SpotCategoryLabel> = {
  Tree: "木",
  Rock: "岩",
  Location: "場所",
  spot: "地域",
  Region: "地域",
};

/** スカイブルーを基準にした爽やか・透明感のあるピンカラー */
export const BASE_PIN_COLOR = "#38bdf8";

export const CATEGORY_PIN_COLORS: Record<SpotCategoryLabel, string> = {
  木: "#34d399",
  岩: "#cbd5e1",
  場所: "#fb923c",
  地域: BASE_PIN_COLOR,
};

export const PIN_COLOR_SELECTED = "#f43f5e";

/** カテゴリごとの背景・文字色（一覧タグ・詳細バッジなどで共有） */
export const CATEGORY_COLOR_MAP: Record<
  SpotCategoryLabel,
  { background: string; foreground: string }
> = {
  木: { background: "bg-green-500", foreground: "text-white" },
  岩: { background: "bg-gray-500", foreground: "text-white" },
  場所: { background: "bg-orange-500", foreground: "text-white" },
  地域: { background: "bg-blue-400", foreground: "text-white" },
};

/** 一覧タブのカテゴリタグ背景（アクティブ時） */
export const CATEGORY_TAG_BG: Record<SpotCategoryLabel, string> = {
  木: CATEGORY_COLOR_MAP.木.background,
  岩: CATEGORY_COLOR_MAP.岩.background,
  場所: CATEGORY_COLOR_MAP.場所.background,
  地域: CATEGORY_COLOR_MAP.地域.background,
};

/** 詳細画面などのカテゴリバッジ用クラス */
export function getCategoryBadgeClasses(label: SpotCategoryLabel): string {
  const { background, foreground } = CATEGORY_COLOR_MAP[label];
  return `${background} ${foreground}`;
}

export function getCategoryTagClasses(
  label: SpotCategoryLabel,
  isActive: boolean
): string {
  if (!isActive) {
    return "bg-slate-100 text-slate-600 hover:bg-slate-200";
  }
  return getCategoryBadgeClasses(label);
}

export function getCategoryTagCountClasses(isActive: boolean): string {
  return isActive
    ? "bg-white/25 text-white"
    : "bg-slate-200 text-slate-600";
}

export function getSpotCategoryLabel(category: string | null): SpotCategoryLabel {
  if (!category) return "地域";
  return CATEGORY_MAP[category] ?? "地域";
}

export function getSpotPinColor(spot: Spot, isSelected: boolean): string {
  if (isSelected) return PIN_COLOR_SELECTED;
  return CATEGORY_PIN_COLORS[getSpotCategoryLabel(spot.category)];
}

export function groupSpotsByCategory(
  spots: Spot[]
): Record<SpotCategoryLabel, Spot[]> {
  const groups: Record<SpotCategoryLabel, Spot[]> = {
    木: [],
    岩: [],
    場所: [],
    地域: [],
  };

  for (const spot of spots) {
    groups[getSpotCategoryLabel(spot.category)].push(spot);
  }

  for (const label of SPOT_CATEGORY_LABELS) {
    groups[label].sort((a, b) => a.no - b.no);
  }

  return groups;
}

const SPOT_IMAGE_BUCKET = "wmd";

export function resolveSpotImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;

  const path = imageUrl.replace(/^\//, "");
  const objectPath = path.startsWith(`${SPOT_IMAGE_BUCKET}/`)
    ? path.slice(SPOT_IMAGE_BUCKET.length + 1)
    : path;

  return `${base}/storage/v1/object/public/${SPOT_IMAGE_BUCKET}/${objectPath}`;
}

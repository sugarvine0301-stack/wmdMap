const WMD_PUBLIC_STORAGE_BASE =
  "https://arqfqjidorxandapoxew.supabase.co/storage/v1/object/public/wmd/";

function getWmdPublicStorageBase(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/wmd/`;
  }
  return WMD_PUBLIC_STORAGE_BASE;
}

/**
 * topography.image_url（例: image/chikei/0.png）を Storage の公開 URL に変換する。
 */
export function resolveTopographyImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  const path = imageUrl.replace(/^\//, "");
  const objectPath = path.startsWith("wmd/") ? path.slice("wmd/".length) : path;

  return `${getWmdPublicStorageBase()}${objectPath}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 説明文内の img src を Storage 公開 URL に差し替える */
export function resolveImageUrlsInTerrainHtml(html: string): string {
  return html.replace(
    /<img([^>]*?)\ssrc=["']([^"']+)["']([^>]*)>/gi,
    (_match, before: string, src: string, after: string) => {
      const resolved = resolveTopographyImageUrl(src) ?? src;
      return `<img${before} src="${resolved}"${after}>`;
    }
  );
}

export function prepareTerrainDescriptionHtml(
  description: string | null | undefined
): string {
  const text = description?.trim();
  if (!text) {
    return "<p>説明文はありません</p>";
  }

  if (/<[a-z][\s\S]*>/i.test(text)) {
    return resolveImageUrlsInTerrainHtml(text);
  }

  return `<p>${escapeHtml(text).replace(/\n/g, "<br />")}</p>`;
}

/** メイン image_url と説明文内の img を順に収集（重複除外） */
export function extractTopographyImageUrls(item: {
  image_url: string | null;
  description: string | null;
}): string[] {
  const urls: string[] = [];

  const push = (raw: string | null | undefined) => {
    if (!raw) return;
    const resolved = resolveTopographyImageUrl(raw) ?? raw;
    if (!urls.includes(resolved)) urls.push(resolved);
  };

  push(item.image_url);

  const description = item.description ?? "";
  const pattern = /<img[^>]+src=["']([^"']+)["']/gi;
  let match = pattern.exec(description);
  while (match) {
    push(match[1]);
    match = pattern.exec(description);
  }

  return urls;
}

export function stripImagesFromTerrainHtml(html: string): string {
  return html.replace(/<img[^>]*>/gi, "").trim();
}

export function prepareTerrainDescriptionTextHtml(
  description: string | null | undefined
): string {
  const text = description?.trim();
  if (!text) {
    return "<p>説明文はありません</p>";
  }

  if (/<[a-z][\s\S]*>/i.test(text)) {
    const withoutImages = stripImagesFromTerrainHtml(text);
    if (!withoutImages || withoutImages === "<p></p>") {
      return "";
    }
    return resolveImageUrlsInTerrainHtml(withoutImages);
  }

  return `<p>${escapeHtml(text).replace(/\n/g, "<br />")}</p>`;
}

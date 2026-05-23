/** アプリ全体で共有するレイアウト・カードスタイル */
export const appUi = {
  pageBg: "bg-slate-50",
  card: "bg-white rounded-xl shadow-md",
  pagePadding: "p-6",
  stackGap: "gap-4",
  /** モバイル下部固定ナビの下までコンテンツが見える余白 */
  tabScrollPadding:
    "px-6 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-8",
  title: "text-lg font-semibold text-slate-900",
  subtitle: "text-sm text-slate-600",
  sectionTitle:
    "border-b-2 border-blue-600 pb-2 text-lg font-semibold text-blue-600",
  /** 一覧など：中央配置モーダル */
  detailModalRoot:
    "fixed inset-0 z-50 flex items-center justify-center px-3 pt-3 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:px-6 md:py-6",
  detailModalBackdrop:
    "absolute inset-0 bg-black/45 backdrop-blur-[2px]",
  detailModalPanel:
    "relative z-10 flex w-full min-w-0 max-w-2xl max-h-[min(88dvh,calc(100dvh-6.5rem))] flex-col overflow-hidden rounded-xl bg-white shadow-xl md:max-h-[min(90vh,800px)] md:rounded-2xl",
  /** マップタブ：地図枠（mapFrameOuter/Inner）と同一インセットで隙間を出さない */
  detailModalRootMap: "fixed inset-0 z-50 md:flex md:items-center md:justify-center md:p-6",
  detailModalBackdropMap: "absolute inset-0 bg-black/55 backdrop-blur-[1px]",
  detailModalPanelMap:
    "absolute inset-x-3 top-3 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] z-10 flex min-h-0 flex-col overflow-hidden rounded-t-2xl rounded-b-xl bg-white shadow-lg md:relative md:inset-auto md:max-h-[min(90vh,800px)] md:w-full md:max-w-2xl md:rounded-2xl md:shadow-xl",
  /** マップタブ：周囲余白＋下部ナビ／ブラウザUI分 */
  mapFrameOuter:
    "flex h-full min-h-0 w-full flex-col bg-slate-50 px-3 pt-3 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:bg-transparent md:p-0",
  /** 一覧タブのカードに近い「浮いた」枠（モバイルのみ） */
  mapFrameInner:
    "relative min-h-0 flex-1 overflow-hidden rounded-t-2xl rounded-b-xl bg-white shadow-lg ring-1 ring-slate-200/70 md:rounded-none md:bg-transparent md:shadow-none md:ring-0",
} as const;

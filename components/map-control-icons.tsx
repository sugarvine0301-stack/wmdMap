type MapControlIconProps = {
  className?: string;
  size?: number;
};

/** 地図の上に立つピン（Lucide MapPinned 相当） */
export function MapPinnedIcon({
  className,
  size = 20,
}: MapControlIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M18 8c0 3.613-3.869 7.429-5.393 8.795a1 1 0 0 1-1.214 0C9.87 15.429 6 11.613 6 8a6 6 0 1 1 12 0" />
      <circle cx="12" cy="8" r="2" />
      <path d="M8.714 14.677 8 21h8l-.714-6.323" />
    </svg>
  );
}

/** 重なった菱形のレイヤー（Lucide Layers 相当） */
export function LayersIcon({ className, size = 20 }: MapControlIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.66 0l8.6-3.91A1 1 0 0 0 22 12" />
      <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.66 0l8.6-3.91A1 1 0 0 0 22 17" />
    </svg>
  );
}

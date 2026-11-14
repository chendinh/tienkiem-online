// Brand art drawn by AI on black and keyed to transparency by scripts/build-brand.py (originals in docs/brand/).
// Logo: square emblem (jade ring with a sword). Lockup: the wide "Tiên Kiếm" title with its sword.
export function Logo({ size = 46, className = '' }: { size?: number; className?: string }) {
  return <img className={`logo ${className}`} src="/brand/emblem.webp" width={size} height={size} alt="Tiên Kiếm" draggable={false} />;
}

const LOCKUP_RATIO = 421 / 880;
export function Lockup({ width = 200, className = '' }: { width?: number; className?: string }) {
  return <img className={`lockup ${className}`} src="/brand/lockup.webp" width={width} height={Math.round(width * LOCKUP_RATIO)} alt="Tiên Kiếm" draggable={false} />;
}

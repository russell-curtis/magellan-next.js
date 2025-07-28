import Image from "next/image";
import { cn } from "@/lib/utils";

interface MagellanLogomarkProps {
  /** Size of the logomark in pixels (will be applied to both width and height) */
  size?: number;
  /** Width of the logomark in pixels (overrides size) */
  width?: number;
  /** Height of the logomark in pixels (overrides size) */
  height?: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether the logomark should be clickable (adds cursor pointer) */
  clickable?: boolean;
  /** Alt text for accessibility */
  alt?: string;
  /** Priority loading for above-the-fold logos */
  priority?: boolean;
}

export function MagellanLogomark({
  size = 32,
  width,
  height,
  className,
  clickable = false,
  alt = "Magellan CRBI",
  priority = false,
}: MagellanLogomarkProps) {
  const finalWidth = width || size;
  const finalHeight = height || size;

  return (
    <Image
      src="/logos/logomark.svg"
      alt={alt}
      width={finalWidth}
      height={finalHeight}
      className={cn(
        "select-none",
        clickable && "cursor-pointer",
        className
      )}
      priority={priority}
      style={{
        width: `${finalWidth}px`,
        height: `${finalHeight}px`,
      }}
    />
  );
}
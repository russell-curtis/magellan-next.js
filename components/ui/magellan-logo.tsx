import Image from "next/image";
import { cn } from "@/lib/utils";

interface MagellanLogoProps {
  /** Width of the logo in pixels */
  width?: number;
  /** Height of the logo in pixels */
  height?: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether the logo should be clickable (adds cursor pointer) */
  clickable?: boolean;
  /** Alt text for accessibility */
  alt?: string;
  /** Priority loading for above-the-fold logos */
  priority?: boolean;
}

export function MagellanLogo({
  width = 180,
  height = 40,
  className,
  clickable = false,
  alt = "Magellan CRBI - Citizenship & Residency Advisory Platform",
  priority = false,
}: MagellanLogoProps) {
  return (
    <Image
      src="/logos/logo.svg"
      alt={alt}
      width={width}
      height={height}
      className={cn(
        "select-none",
        clickable && "cursor-pointer",
        className
      )}
      priority={priority}
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
    />
  );
}
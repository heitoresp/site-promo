"use client";

import Image from "next/image";

interface PromoImageProps {
  src: string | null;
  alt: string;
  loja: string;
  fill?: boolean;
  sizes?: string;
  className?: string;
}

export function PromoImage({ src, alt, loja, fill = true, sizes, className }: PromoImageProps) {
  const fallback = `https://placehold.co/400x300/16161f/f97316?text=${encodeURIComponent(loja)}`;

  return (
    <Image
      src={src ?? fallback}
      alt={alt}
      fill={fill}
      sizes={sizes}
      className={className}
      onError={(e) => {
        (e.target as HTMLImageElement).src = fallback;
      }}
    />
  );
}

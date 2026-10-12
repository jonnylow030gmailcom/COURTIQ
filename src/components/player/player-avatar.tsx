/* eslint-disable @next/next/no-img-element -- private, signierte URLs: kein Next-Bildproxy */
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/domain/format";

interface PlayerAvatarProps {
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZES = {
  xs: "size-7 text-[0.65rem]",
  sm: "size-9 text-xs",
  md: "size-11 text-sm",
  lg: "size-16 text-lg",
  xl: "size-28 text-3xl sm:size-36 sm:text-4xl",
} as const;

export function PlayerAvatar({ firstName, lastName, photoUrl, size = "md", className }: PlayerAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = photoUrl && failedUrl !== photoUrl;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-secondary to-muted font-semibold text-secondary-foreground ring-1 ring-border select-none",
        SIZES[size],
        className,
      )}
    >
      {showPhoto ? (
        <img
          src={photoUrl}
          alt=""
          className="size-full object-cover"
          draggable={false}
          onError={() => setFailedUrl(photoUrl)}
        />
      ) : (
        <span aria-hidden>{initials(firstName, lastName)}</span>
      )}
    </span>
  );
}

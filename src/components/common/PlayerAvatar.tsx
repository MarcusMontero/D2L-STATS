"use client";

import React, { useState, useEffect } from "react";
import { User } from "lucide-react";

interface PlayerAvatarProps {
  photoUrl?: string;
  name?: string;
  jerseyNumber?: number;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  photoUrl,
  name = "Player",
  jerseyNumber,
  size = "md",
  className = "",
}) => {
  const [hasError, setHasError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sizeMap = {
    xs: { wrap: "w-6 h-6", text: "text-[9px]", icon: "w-3.5 h-3.5" },
    sm: { wrap: "w-8 h-8", text: "text-[11px]", icon: "w-4 h-4" },
    md: { wrap: "w-10 h-10", text: "text-xs", icon: "w-5 h-5" },
    lg: { wrap: "w-14 h-14", text: "text-sm", icon: "w-7 h-7" },
    xl: { wrap: "w-16 h-16", text: "text-base", icon: "w-8 h-8" },
  };

  const getInitials = (n: string) => {
    const parts = n.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase() || "P";
  };

  const renderPlaceholder = () => (
    <div
      title={name}
      className={`shrink-0 rounded-full bg-gradient-to-br from-d2l-forest via-d2l-court to-black border border-d2l-gold/50 flex items-center justify-center font-athletic font-black text-d2l-gold select-none shadow-sm ${sizeMap[size].wrap} ${sizeMap[size].text} ${className}`}
    >
      <span>{getInitials(name)}</span>
    </div>
  );

  // Before mount: always render the initials placeholder so server and client agree
  if (!mounted) return renderPlaceholder();

  const isImageAvailable = photoUrl && photoUrl.trim() !== "" && !hasError;

  if (isImageAvailable) {
    return (
      <div
        className={`relative shrink-0 rounded-full overflow-hidden border border-d2l-gold/40 bg-d2l-court ${sizeMap[size].wrap} ${className}`}
      >
        <img
          src={photoUrl}
          alt={name}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return renderPlaceholder();
};

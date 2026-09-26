"use client";

import React, { useState } from "react";
import { Shield } from "lucide-react";

interface TeamLogoProps {
  logo?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

export const TeamLogo: React.FC<TeamLogoProps> = ({
  logo,
  name = "Team",
  size = "md",
  className = "",
}) => {
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    xs: "w-5 h-5 text-xs",
    sm: "w-7 h-7 text-sm",
    md: "w-9 h-9 text-base",
    lg: "w-12 h-12 text-xl",
    xl: "w-16 h-16 text-3xl",
  };

  const isImage = logo && (logo.startsWith("http") || logo.startsWith("data:image") || logo.startsWith("/") || logo.startsWith("blob:"));

  if (isImage && !hasError) {
    return (
      <div className={`relative shrink-0 rounded-full overflow-hidden bg-d2l-court border border-d2l-gold/40 flex items-center justify-center ${sizeClasses[size]} ${className}`}>
        <img
          src={logo}
          alt={name}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // If emoji or text icon provided
  if (logo && logo.length <= 4 && !hasError) {
    return (
      <div className={`shrink-0 rounded-full bg-d2l-court border border-d2l-gold/40 flex items-center justify-center ${sizeClasses[size]} ${className}`}>
        <span>{logo}</span>
      </div>
    );
  }

  // Fallback initial shield
  const initial = name ? name.charAt(0).toUpperCase() : "T";

  return (
    <div className={`shrink-0 rounded-full bg-gradient-to-br from-d2l-forest to-d2l-court border border-d2l-gold/60 flex items-center justify-center font-athletic font-black text-d2l-gold ${sizeClasses[size]} ${className}`}>
      <span>{initial}</span>
    </div>
  );
};

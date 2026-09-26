"use client";

import React, { useState, useRef } from "react";
import { Upload, Trash2, RefreshCw, Loader2, AlertTriangle, Image as ImageIcon } from "lucide-react";
import { uploadImage, deleteImage } from "@/lib/storageHelper";
import { TeamLogo } from "./TeamLogo";
import { PlayerAvatar } from "./PlayerAvatar";

interface ImageUploadFieldProps {
  value?: string;
  onChange: (newUrl: string) => void;
  bucket: "team-logos" | "player-photos";
  label: string;
  fallbackType: "team" | "player";
  fallbackName?: string;
  jerseyNumber?: number;
  hint?: string;
  className?: string;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  value,
  onChange,
  bucket,
  label,
  fallbackType,
  fallbackName = "D2L",
  jerseyNumber,
  hint = "PNG, JPG up to 5MB",
  className = "",
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasImage = Boolean(value && value.trim() !== "");

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setIsConfirmingRemove(false);

    try {
      // If there was an existing image in Supabase, clean it up optionally
      if (value) {
        await deleteImage(value, bucket);
      }

      const uploadedUrl = await uploadImage(file, bucket);
      onChange(uploadedUrl);
    } catch (err) {
      console.error("Image upload failed:", err);
      alert("Failed to upload image. Please try another file.");
    } finally {
      setIsUploading(false);
      // Reset input value so same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleConfirmRemove = async () => {
    if (value) {
      await deleteImage(value, bucket);
    }
    onChange("");
    setIsConfirmingRemove(false);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Label */}
      <label className="text-xs text-gray-300 font-bold flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-d2l-gold" />
          <span>{label}</span>
        </span>
        <span className="text-[10px] text-gray-400 font-normal">
          {hasImage ? "Active Image" : "Fallback to Initials"}
        </span>
      </label>

      {/* Main Container */}
      <div className="bg-d2l-cardDark border border-d2l-borderDark rounded-xl p-3 shadow-inner">
        {isUploading ? (
          /* 1. UPLOADING STATE */
          <div className="flex flex-col items-center justify-center py-4 text-center space-y-2 animate-pulse">
            <Loader2 className="w-7 h-7 text-d2l-gold animate-spin" />
            <span className="text-xs text-d2l-gold font-athletic font-bold tracking-wider uppercase">
              Uploading image to Supabase Storage...
            </span>
          </div>
        ) : hasImage ? (
          /* 2. HAS IMAGE STATE (Preview + Replace + Remove with Confirmation) */
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {/* Image Preview */}
              <div className="relative shrink-0">
                {fallbackType === "team" ? (
                  <TeamLogo logo={value} name={fallbackName} size="xl" />
                ) : (
                  <PlayerAvatar photoUrl={value} name={fallbackName} jerseyNumber={jerseyNumber} size="xl" />
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-d2l-forest hover:bg-d2l-forestLight border border-d2l-gold/40 text-xs font-athletic font-bold text-white flex items-center gap-1.5 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-d2l-gold" />
                    <span>Replace Image</span>
                  </button>

                  {!isConfirmingRemove && (
                    <button
                      type="button"
                      onClick={() => setIsConfirmingRemove(true)}
                      className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-xs font-athletic font-bold text-red-200 flex items-center gap-1.5 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 truncate">{hint}</p>
              </div>
            </div>

            {/* Inline Confirmation Step for Removing Image */}
            {isConfirmingRemove && (
              <div className="p-2.5 rounded-lg bg-red-950/80 border border-red-500/60 flex items-center justify-between gap-2 animate-in fade-in zoom-in-95">
                <div className="flex items-center gap-2 text-red-200 text-xs font-medium">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Remove this image? It will revert to the gold initials badge.</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsConfirmingRemove(false)}
                    className="px-2.5 py-1 rounded text-[11px] bg-gray-800 text-gray-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRemove}
                    className="px-3 py-1 rounded text-[11px] bg-red-600 hover:bg-red-500 text-white font-bold"
                  >
                    Yes, Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* 3. EMPTY STATE (Fallback badge preview + Upload trigger) */
          <div className="flex items-center gap-3">
            {/* Fallback Badge Preview */}
            <div className="shrink-0">
              {fallbackType === "team" ? (
                <TeamLogo logo="" name={fallbackName} size="xl" />
              ) : (
                <PlayerAvatar photoUrl="" name={fallbackName} jerseyNumber={jerseyNumber} size="xl" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-lg bg-d2l-forest hover:bg-d2l-forestLight border border-d2l-gold/40 text-xs font-athletic font-bold text-white flex items-center gap-2 shadow-sm transition"
              >
                <Upload className="w-4 h-4 text-d2l-gold" />
                <span>Upload {fallbackType === "team" ? "Team Logo" : "Face Photo"}</span>
              </button>
              <span className="text-[10px] text-gray-400 block mt-1">
                {hint} • Automatic fallback to initials badge
              </span>
            </div>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp"
          onChange={handleFileSelected}
          className="hidden"
        />
      </div>
    </div>
  );
};

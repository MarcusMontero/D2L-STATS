"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, Trash2, X, Lock, KeyRound, AlertCircle, ShieldAlert } from "lucide-react";
import { verifyPin } from "@/lib/pinHelper";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  requirePin?: boolean;
  expectedPinHash?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  variant = "danger",
  requirePin = false,
  expectedPinHash,
  onConfirm,
  onCancel,
}) => {
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setPinError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);

    if (requirePin) {
      if (!pin.trim()) {
        setPinError("Please enter your Admin Security PIN to confirm deletion.");
        return;
      }

      setIsVerifying(true);
      try {
        const isValid = await verifyPin(pin, expectedPinHash || "2026");
        if (!isValid) {
          setPinError("Incorrect Admin Security PIN. Deletion authorization failed.");
          setIsVerifying(false);
          return;
        }
      } catch {
        setPinError("Failed to verify PIN. Please try again.");
        setIsVerifying(false);
        return;
      }
      setIsVerifying(false);
    }

    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-d2l-panelDark border-2 border-d2l-gold/60 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 text-white">
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-full ${
                variant === "danger"
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                  : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
              }`}
            >
              {variant === "danger" ? (
                <Trash2 className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="font-athletic font-extrabold text-lg text-white">
                {title}
              </h3>
              {requirePin && (
                <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Admin PIN Required
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-d2l-cardDark transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Content */}
        <div className="text-xs text-gray-300 space-y-2 leading-relaxed">
          {message}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* PIN Input Field if required */}
          {requirePin && (
            <div className="space-y-2 bg-black/40 p-3.5 rounded-xl border border-d2l-borderDark">
              <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-d2l-gold" />
                <span>Enter Admin Security PIN</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  inputMode="numeric"
                  autoFocus
                  placeholder="Enter your security PIN"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    if (pinError) setPinError(null);
                  }}
                  className="w-full bg-d2l-cardDark border border-d2l-borderDark focus:border-d2l-gold rounded-xl pl-9 pr-3 py-2.5 text-white font-mono font-bold tracking-widest text-center text-sm outline-none transition"
                />
              </div>

              {pinError && (
                <div className="bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs p-2 rounded-lg flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="font-medium text-[11px]">{pinError}</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-d2l-borderDark">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition"
            >
              {cancelText}
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className={`px-5 py-2 rounded-lg text-xs font-athletic font-bold uppercase transition shadow-lg flex items-center gap-1.5 ${
                variant === "danger"
                  ? "bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white"
                  : "bg-d2l-orange hover:bg-d2l-orangeHover text-white"
              }`}
            >
              {variant === "danger" && <Trash2 className="w-3.5 h-3.5" />}
              <span>{isVerifying ? "Verifying..." : confirmText}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

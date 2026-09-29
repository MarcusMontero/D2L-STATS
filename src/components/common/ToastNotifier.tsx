"use client";

import React from "react";
import { useD2LStore } from "@/store/useD2LStore";
import { AlertTriangle, CheckCircle2, Info, X, Database, Download, RefreshCw } from "lucide-react";

export const ToastNotifier: React.FC = () => {
  const { toastMessage, setToastMessage, syncAllLocalDataToSupabase, downloadLocalDataBackup } = useD2LStore();

  if (!toastMessage) return null;

  const isError = toastMessage.type === "error";
  const isWarning = toastMessage.type === "warning";
  const isSuccess = toastMessage.type === "success";

  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto sm:max-w-md z-50 animate-in fade-in slide-in-from-top-3 duration-200">
      <div
        className={`rounded-xl border-2 p-4 shadow-2xl backdrop-blur-md text-white ${
          isError
            ? "bg-rose-950/95 border-rose-500/80 shadow-rose-950/50"
            : isWarning
            ? "bg-amber-950/95 border-amber-500/80 shadow-amber-950/50"
            : isSuccess
            ? "bg-emerald-950/95 border-emerald-500/80 shadow-emerald-950/50"
            : "bg-blue-950/95 border-blue-500/80 shadow-blue-950/50"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            {isError && <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
            {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
            {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
            {!isError && !isWarning && !isSuccess && <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />}

            <div className="space-y-1">
              <h4 className="font-athletic font-bold text-sm tracking-wide leading-tight">
                {toastMessage.text}
              </h4>
              {toastMessage.details && (
                <p className="text-xs text-gray-300/90 leading-relaxed font-mono bg-black/40 p-2 rounded border border-white/10 break-all">
                  {toastMessage.details}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => setToastMessage(null)}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-black/30 transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Bar for Write Errors or Warnings */}
        {(isError || isWarning) && (
          <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-end gap-2 text-xs">
            <button
              onClick={() => downloadLocalDataBackup()}
              className="px-2.5 py-1 rounded bg-black/40 hover:bg-black/60 border border-white/20 text-gray-200 font-bold flex items-center gap-1 transition"
              title="Download local JSON data backup"
            >
              <Download className="w-3.5 h-3.5 text-d2l-gold" />
              <span>Backup JSON</span>
            </button>
            <button
              onClick={() => syncAllLocalDataToSupabase()}
              className="px-3 py-1 rounded bg-d2l-forest hover:bg-d2l-forestLight border border-d2l-gold/40 text-white font-bold font-athletic flex items-center gap-1 transition"
              title="Retry pushing all local state to Supabase"
            >
              <RefreshCw className="w-3.5 h-3.5 text-d2l-gold" />
              <span>Force Sync</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

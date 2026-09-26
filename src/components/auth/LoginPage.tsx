"use client";

import React, { useState } from "react";
import { useD2LStore } from "@/store/useD2LStore";
import { StaffRole } from "@/lib/types";
import {
  Lock,
  Mail,
  Shield,
  Loader2,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Users,
} from "lucide-react";

interface LoginPageProps {
  onLoginSuccess: (landingTab: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login } = useD2LStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter both your staff email address and password.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        const landing = res.role === "admin" ? "setup" : "tracker";
        onLoginSuccess(landing);
      } else {
        setErrorMessage(res.error || "Invalid email or password. Please check your credentials.");
      }
    } catch {
      setErrorMessage("An unexpected authentication error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-d2l-dark text-white flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Decorative Accents */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-d2l-forest/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-d2l-orange/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Crest & Title Header */}
        <div className="text-center space-y-3">
          <div className="relative inline-block">
            <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-d2l-forest via-d2l-panelDark to-black border-2 border-d2l-gold/60 p-2 shadow-2xl flex items-center justify-center">
              <img
                src="/D2L_LOGO.png"
                alt="D2L Crest Logo"
                className="h-20 w-auto max-w-[80px] object-contain drop-shadow-md"
              />
            </div>
            <span className="absolute -bottom-1 -right-1 bg-d2l-orange text-white text-[9px] font-athletic font-black px-2 py-0.5 rounded-full border border-black uppercase tracking-wider">
              Season 10
            </span>
          </div>

          <div>
            <h1 className="font-athletic font-black text-3xl tracking-wider text-white">
              DISTRICT 2 <span className="text-d2l-gold">LEAGUE</span>
            </h1>
            <p className="text-xs text-d2l-goldLight font-semibold tracking-wide uppercase mt-0.5">
              Ayala Alabang Village • Courtside Control Panel
            </p>
          </div>
        </div>

        {/* Main Login Card */}
        <div className="bg-d2l-panelDark border-2 border-d2l-gold/50 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="border-b border-d2l-borderDark pb-3 flex items-center justify-between">
            <div>
              <h2 className="font-athletic font-extrabold text-lg text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-d2l-gold" /> STAFF SIGN IN
              </h2>
              <p className="text-[11px] text-gray-400">
                Enter your credentials to access live tracking and league tools.
              </p>
            </div>
          </div>

          {/* Theme-styled Error Alert */}
          {errorMessage && (
            <div className="bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs p-3 rounded-xl flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Email Field */}
            <div className="space-y-1">
              <label className="block text-gray-300 font-bold uppercase text-[10px] tracking-wider">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="e.g. marcus@d2league.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-d2l-cardDark border border-d2l-borderDark focus:border-d2l-gold rounded-xl pl-9 pr-3 py-3 text-white placeholder-gray-500 font-medium outline-none transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="block text-gray-300 font-bold uppercase text-[10px] tracking-wider">
                Password or PIN
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter password or PIN"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-d2l-cardDark border border-d2l-borderDark focus:border-d2l-gold rounded-xl pl-9 pr-10 py-3 text-white placeholder-gray-500 font-medium outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-d2l-orange hover:bg-d2l-orangeHover disabled:opacity-60 text-white font-athletic font-black uppercase text-sm py-3.5 rounded-xl orange-glow transition shadow-lg flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>SIGNING IN...</span>
                </>
              ) : (
                <>
                  <span>SIGN IN TO COURTSIDE PANEL</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo Accounts Helper Card */}
          <div className="pt-4 border-t border-d2l-borderDark space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3 text-d2l-gold" /> Quick Sign-In Presets
              </span>
              <span className="text-[9px] text-d2l-gold font-normal">Select account</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoFill("marcus@d2league.ph", "admin")}
                className="bg-d2l-cardDark hover:bg-d2l-forest border border-d2l-borderDark hover:border-d2l-gold/50 p-2 rounded-lg text-left transition"
              >
                <div className="font-bold text-white text-[11px]">System Admin</div>
                <div className="text-[9px] text-amber-300 font-mono">marcus@d2league.ph</div>
                <div className="text-[9px] text-gray-400 mt-0.5">Password: admin</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoFill("dave@d2league.ph", "staff")}
                className="bg-d2l-cardDark hover:bg-d2l-forest border border-d2l-borderDark hover:border-d2l-gold/50 p-2 rounded-lg text-left transition"
              >
                <div className="font-bold text-white text-[11px]">Courtside Staff</div>
                <div className="text-[9px] text-emerald-300 font-mono">dave@d2league.ph</div>
                <div className="text-[9px] text-gray-400 mt-0.5">Password: staff</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-[11px] text-center text-gray-500">
          Account creation is restricted. New staff accounts are created exclusively by System Admins inside League Setup.
        </p>
      </div>
    </div>
  );
};

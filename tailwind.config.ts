import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        d2l: {
          dark: "#06180E",
          court: "#0B2416",
          forest: "#0E3E26",
          forestLight: "#165937",
          gold: "#D4AF37",
          goldLight: "#F5D77F",
          goldDark: "#9A7B1C",
          orange: "#FF6B00",
          orangeHover: "#E65A00",
          orangeLight: "#FF8C38",
          bronze: "#B37D4E",
          silver: "#E2E8F0",
          cardDark: "#0D2A1C",
          panelDark: "#091D13",
          borderDark: "#1C4E33",
          borderGold: "rgba(212, 175, 55, 0.35)",
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        athletic: ["var(--font-oswald)", "Impact", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 15px rgba(255, 107, 0, 0.6)" },
          "50%": { boxShadow: "0 0 25px rgba(255, 107, 0, 0.9)" },
        },
        badgeFlash: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.15)", backgroundColor: "#FF6B00" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "pulse-glow": "pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "badge-flash": "badgeFlash 0.4s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;

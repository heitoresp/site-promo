import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea6a0a",
          700: "#c2550b",
          800: "#9a440f",
          900: "#7c3a0e",
          950: "#431407",
        },
        hot: "#ef4444",
        nova: "#22c55e",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-cal)", "var(--font-inter)", "sans-serif"],
      },
      animation: {
        "fade-in":      "fadeIn 0.4s ease-out",
        "slide-up":     "slideUp 0.5s ease-out",
        "pulse-glow":   "pulseGlow 2s ease-in-out infinite",
        "shimmer":      "shimmer 1.5s infinite",
        "float":        "float 3s ease-in-out infinite",
        "badge-pop":    "badgePop 0.3s cubic-bezier(0.34,1.56,0.64,1)",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(249,115,22,0.4)" },
          "50%":       { boxShadow: "0 0 40px rgba(249,115,22,0.8), 0 0 60px rgba(249,115,22,0.3)" },
        },
        shimmer: {
          from: { backgroundPosition: "-200% 0" },
          to:   { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":       { transform: "translateY(-6px)" },
        },
        badgePop: {
          from: { transform: "scale(0.5)", opacity: "0" },
          to:   { transform: "scale(1)",   opacity: "1" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":  "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "mesh-gradient":
          "radial-gradient(at 27% 37%, hsla(215,98%,61%,0.15) 0px, transparent 50%), radial-gradient(at 97% 21%, hsla(125,98%,72%,0.1) 0px, transparent 50%), radial-gradient(at 52% 99%, hsla(354,98%,61%,0.1) 0px, transparent 50%), radial-gradient(at 10% 29%, hsla(256,96%,67%,0.1) 0px, transparent 50%), radial-gradient(at 97% 96%, hsla(38,60%,74%,0.1) 0px, transparent 50%), radial-gradient(at 33% 50%, hsla(222,67%,73%,0.08) 0px, transparent 50%), radial-gradient(at 79% 53%, hsla(343,68%,79%,0.08) 0px, transparent 50%)",
      },
      boxShadow: {
        "glow-orange": "0 0 30px rgba(249,115,22,0.35)",
        "glow-red":    "0 0 30px rgba(239,68,68,0.35)",
        "card":        "0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -2px rgba(0,0,0,0.2)",
        "card-hover":  "0 20px 40px -10px rgba(0,0,0,0.4), 0 8px 16px -4px rgba(0,0,0,0.3)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;

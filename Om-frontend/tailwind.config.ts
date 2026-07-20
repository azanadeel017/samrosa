import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#3A2417",
        cream: "#FEEBC0",
        peach: "#FFCC93",
        golden: "#FEC671",
        marigold: "#F7A944",
        burnt: "#C75B12",
        terracotta: "#CC5A3F",
        surface: "#FFF8EA",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["'General Sans'", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        tightest: "-0.035em",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(58,36,23,0.06), 0 8px 24px -8px rgba(58,36,23,0.10)",
        raised: "0 4px 12px -6px rgba(58,36,23,0.18), 0 24px 60px -20px rgba(199,91,18,0.18)",
      },
      keyframes: {
        "rise-in": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "50%": { transform: "translate(2%, -1%) scale(1.03)" },
        },
      },
      animation: {
        "rise-in": "rise-in 700ms cubic-bezier(0.2, 0.7, 0.2, 1) both",
        "float-slow": "float-slow 14s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

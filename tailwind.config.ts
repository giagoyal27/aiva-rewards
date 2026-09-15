import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // AIVA design system — soft neutral background, blush accent,
        // silver-inspired detail, dark warm text. No gold, no neon.
        aiva: {
          bg: "#fdfbf8",
          card: "#ffffff",
          ink: "#2b2320",
          muted: "#8a7f78",
          blush: "#f3d9d6",
          blushDark: "#e2a8a3",
          silver: "#c9cdd3",
          line: "#ece4de",
          success: "#7d9d7f",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        soft: "0 2px 20px -4px rgba(43, 35, 32, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        black: {
          DEFAULT: "#000000",
          ink: "#060b14",
        },
        navy: {
          DEFAULT: "#0c1829",
          2: "#152238",
          900: "#08111F",
          800: "#0E1E35",
        },
        slate: "#1a2d48",
        paper: "#f2f0eb",
        accent: "#FF6B35",
        accent2: "#FF4500",
        teal: "#00C9B1",
        gold: "#F5C842",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: [
          "var(--font-body)",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        sans: [
          "var(--font-body)",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      maxWidth: {
        page: "1180px",
        prose: "42rem",
      },
      borderRadius: {
        ws: "6px",
        "ws-lg": "10px",
      },
    },
  },
  plugins: [],
};

export default config;

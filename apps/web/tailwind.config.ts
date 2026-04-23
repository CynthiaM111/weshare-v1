import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          primary: "rgb(var(--primary) / <alpha-value>)",
          accent: "rgb(var(--accent) / <alpha-value>)",
          muted: "rgb(var(--muted) / <alpha-value>)",
          border: "rgb(var(--border) / <alpha-value>)",
          card: "rgb(var(--card) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
};
export default config;


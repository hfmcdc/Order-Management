import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep marigold / turmeric — the lamp-oil warmth of Diwali, not the
        // generic AI terracotta. Used sparingly for accents and primary actions.
        marigold: {
          50: "#FFF8E9",
          100: "#FFEFC7",
          400: "#F0A93A",
          500: "#DE8F1F",
          600: "#B96F12",
        },
        // Deep maroon/betel — grounding color for text and headers.
        maroon: {
          700: "#5C1A2B",
          800: "#43121F",
          900: "#2E0C15",
        },
        ivory: "#FBF7F0",
        leaf: {
          500: "#3E7A4F",
          600: "#2F5F3D",
        },
        clay: {
          100: "#F1E7DC",
          300: "#DDC7AE",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "serif"],
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};
export default config;

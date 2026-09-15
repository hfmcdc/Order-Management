import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Matches the official Diwali 2026 logo: rich orange/gold body,
        // deep maroon ribbon and accents, warm cream backgrounds.
        marigold: {
          50: "#FFF8E9",
          100: "#FFEAC0",
          400: "#F5A623",
          500: "#E8890B",
          600: "#C46F05",
        },
        maroon: {
          700: "#6B1220",
          800: "#4A0D17",
          900: "#330810",
        },
        ivory: "#FFF9EE",
        gold: {
          300: "#F6D77A",
          500: "#E0AA3E",
        },
        leaf: {
          500: "#3E7A4F",
          600: "#2F5F3D",
        },
        clay: {
          100: "#F4E8D6",
          300: "#E2C79A",
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

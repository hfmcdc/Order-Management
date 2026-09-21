import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // "Saffron Noir" — deep bordeaux + burnished copper on warm stone.
        // No pure white or black anywhere; every surface stays in the same
        // warm cream/tan family, just at different depths.
        marigold: {
          50: "#F7EEE3",
          100: "#EDD6B8",
          400: "#C4864B",
          500: "#B87333", // Accent
          600: "#96602A",
        },
        maroon: {
          700: "#6B2038",
          800: "#4A1526", // Primary
          900: "#35101C",
        },
        ivory: "#F6EEDF", // Surface — warm sand, used for cards and light text-on-dark
        gold: {
          300: "#D9B77E",
          500: "#B87333",
        },
        leaf: {
          500: "#3E7A4F",
          600: "#2F5F3D",
        },
        clay: {
          100: "#EFE6D6",
          300: "#D9C7A8",
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

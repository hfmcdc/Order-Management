import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark surfaces and light text, with a clear blue accent.
        // Token NAMES are unchanged so every existing class keeps working:
        //   maroon-*  = TEXT ramp   (800 = main text, 700 = muted text, 900 = strongest)
        //   ivory     = SURFACE     (cards, inputs, nav)
        //   marigold  = ACCENT      (blue buttons, links, and tinted fills)
        //   clay      = LINES/FILLS (subtle dark fills and borders)
        //   wine      = deep blue (hero and sidebar); cream/ink = light text
        maroon: {
          700: "#B4BED0",
          800: "#F3F5FA",
          900: "#FFFFFF",
        },
        ivory: "#12151C",
        cream: "#F3F5FA",
        ink: "#FFFFFF",
        wine: {
          700: "#1E3A8A",
          800: "#14296B",
          900: "#0B1B4D",
        },
        marigold: {
          50: "#151C2B",
          100: "#202B40",
          400: "#83A5FF",
          500: "#4169E1",
          600: "#9AB4FF",
        },
        gold: {
          300: "#9AB4FF",
          500: "#4169E1",
        },
        leaf: {
          500: "#1E8E55",
          600: "#15783F",
        },
        clay: {
          100: "#1C222D",
          300: "#343C4A",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      // The app's classes use font-500 / font-600 / font-700, which Tailwind does not
      // define by default — so headings were silently rendering at normal weight.
      fontWeight: {
        "500": "500",
        "600": "600",
        "700": "700",
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};
export default config;

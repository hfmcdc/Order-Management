import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // "Deep Blue & White" — white surfaces, navy text, royal-blue accent.
        // Token NAMES are unchanged so every existing class keeps working:
        //   maroon-*  = TEXT ramp   (800 = main text, 700 = muted text, 900 = strongest)
        //   ivory     = SURFACE     (cards, inputs, nav)  — page background is set in globals.css
        //   marigold  = ACCENT      (500 = blue buttons, 600 = accent text, 50/100 = tinted fills)
        //   clay      = LINES/FILLS (100 = subtle fill, 300 = borders)
        //   wine      = deep navy (hero, dark chips, sidebar); cream = white-on-navy text; ink = white-on-blue text
        maroon: {
          700: "#4B5B7A",
          800: "#0B1B3A",
          900: "#050F26",
        },
        ivory: "#FFFFFF",
        cream: "#FFFFFF",
        ink: "#FFFFFF",
        wine: {
          700: "#1E3A8A",
          800: "#14296B",
          900: "#0B1B4D",
        },
        marigold: {
          50: "#F1F6FF",
          100: "#E1EBFF",
          400: "#4F7FE8",
          500: "#1F4BC4",
          600: "#17399A",
        },
        gold: {
          300: "#93B4F5",
          500: "#1F4BC4",
        },
        leaf: {
          500: "#1E8E55",
          600: "#15783F",
        },
        clay: {
          100: "#EAF0FA",
          300: "#D3DEF0",
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

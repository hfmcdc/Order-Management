import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // "Midnight Gold" — warm near-black surfaces, cream text, antique-gold accent.
        // Token NAMES are unchanged from before, so every existing class keeps working:
        //   maroon-*  = TEXT ramp   (800 = main text, 700 = muted text, 900 = brightest)
        //   ivory     = SURFACE     (cards, inputs, nav)  — page background is set in globals.css
        //   marigold  = ACCENT      (500 = gold buttons, 600 = accent text, 50/100 = tinted fills)
        //   clay      = LINES/FILLS (100 = subtle fill, 300 = borders)
        // New purpose-named tokens: wine (dark chips + hero), cream (light text on dark), ink (dark text on gold).
        maroon: {
          700: "#CDBFA7",
          800: "#F1E6D2",
          900: "#FBF3E3",
        },
        ivory: "#1E1916",
        cream: "#F1E6D2",
        ink: "#1A1411",
        wine: {
          700: "#7A2B3D",
          800: "#5C1F2E",
          900: "#3A1420",
        },
        marigold: {
          50: "#2A2015",
          100: "#3B2B18",
          400: "#E3B15F",
          500: "#D9A441",
          600: "#EBC273",
        },
        gold: {
          300: "#D9B77E",
          500: "#D9A441",
        },
        leaf: {
          500: "#3E8A57",
          600: "#8CCB9B",
        },
        clay: {
          100: "#2B241F",
          300: "#40372F",
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

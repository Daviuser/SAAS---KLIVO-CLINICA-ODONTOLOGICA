import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#14231F",
          muted: "#5B6B67",
        },
        surface: "#F4F6F4",
        border: "#E1E5E2",
        primary: {
          DEFAULT: "#0E6B5C",
          light: "#3FBF98",
          dark: "#0A4E44",
        },
        alert: "#B5502E",
      },
      fontFamily: {
        display: ["var(--font-montserrat)", "Arial", "sans-serif"],
        sans: ["var(--font-montserrat)", "Arial", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "6px",
      },
    },
  },
  plugins: [],
};

export default config;

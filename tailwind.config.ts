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
        // Keeper's Heart Brand Colors
        whiskey: {
          amber: "#B8860B",
          light: "#CD853F",
        },
        cream: "#FFF8DC",
        emerald: "#2C5F2D",
        copper: "#B87333",
        charcoal: "#2C2C2C",
        oak: "#F5F5DC",
      },
      fontFamily: {
        playfair: ["Playfair Display", "serif"],
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "12px",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};

export default config;

/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        void: "#0a0a0f",
        abyss: "#1a1a2e",
        ancient: "#c9a227",
        stardust: "#e0e0e0",
        mystic: "#7b68ee",
        crimson: "#8b0000",
        goldGlow: "#ffd700",
      },
      fontFamily: {
        display: ["Cinzel", "serif"],
        body: ["Noto Sans SC", "sans-serif"],
      },
      animation: {
        "spin-slow": "spin 8s linear infinite",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "flip": "flip 0.8s ease-in-out forwards",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 5px rgba(201, 162, 39, 0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(201, 162, 39, 0.6)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        flip: {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(180deg)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

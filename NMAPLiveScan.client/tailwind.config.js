/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Consolas", "monospace"],
      },
      colors: {
        terminal: {
          bg: "#0d1117",
          surface: "#161b22",
          border: "#30363d",
          green: "#3fb950",
          cyan: "#79c0ff",
          red: "#ff7b72",
          yellow: "#e3b341",
          purple: "#d2a8ff",
          muted: "#8b949e",
        },
      },
    },
  },
  plugins: [],
};
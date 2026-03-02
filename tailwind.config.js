/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#8a2ce2",
        "background-light": "#f7f6f8",
        "background-dark": "#0a080c",
        "card-dark": "#16111d",
      },
      fontFamily: {
        "display": ["Space Grotesk", "sans-serif"]
      },
      borderRadius: {
        "DEFAULT": "0.75rem",
        "lg": "1.25rem",
        "xl": "2rem",
        "full": "9999px"
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: "#000000",
        card: "#121212",
        primary: "#ffffff",
        secondary: "#a0a0a0",
        accent: {
          cyan: "#00f2fe",
          purple: "#4facfe",
        }
      }
    },
  },
  plugins: [],
}

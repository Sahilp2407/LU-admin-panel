/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'custom-orange': {
          light: '#FFF8E7',
          DEFAULT: '#FFAA02',
        },
      },
    },
  },
  plugins: [],
}

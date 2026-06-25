/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Calm, muted, private-feeling palette (slate/stone, no bright wellness colors).
        ink: {
          DEFAULT: '#1f2933',
          soft: '#3e4c59',
          faint: '#7b8794',
        },
        paper: '#f7f6f3',
        card: '#ffffff',
        accent: {
          DEFAULT: '#4a6572',
          soft: '#e1e8eb',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

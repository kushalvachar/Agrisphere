/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Agriculture-inspired green (primary), deep blue (intelligence/data), orange (actions/warnings)
        agri: {
          50: '#f0fbf3', 100: '#d9f5e0', 200: '#b3ebc2', 300: '#80daa0',
          400: '#4dc27f', 500: '#2ba463', 600: '#1e8450', 700: '#1a6a43',
          800: '#175538', 900: '#14462f',
        },
        intel: {
          50: '#eef4ff', 100: '#dbe7ff', 200: '#b8cfff', 300: '#8bb0ff',
          400: '#5c8bff', 500: '#3766f5', 600: '#274bd1', 700: '#213aa8',
          800: '#1f3487', 900: '#1d306f',
        },
        warn: {
          50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74',
          400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
};

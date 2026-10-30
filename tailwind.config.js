/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: '#090b10',
        panel: '#0f1219',
        card: '#131722',
        'card-hover': '#181e2b',
        'card-recess': '#0a0d13',
        brand: {
          500: '#3b82f6',
          600: '#2563eb',
        },
        critical: {
          500: '#f43f5e',
          950: '#260a12',
        },
        warning: {
          500: '#f59e0b',
          950: '#241407',
        },
        healthy: {
          500: '#10b981',
          950: '#071f16',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.07)',
        'card-selected': '0 0 0 2px #3b82f6, 0 8px 30px -4px rgba(59, 130, 246, 0.4)',
        'card-critical': '0 0 0 1px rgba(244, 63, 94, 0.6), 0 8px 30px -4px rgba(244, 63, 94, 0.25)',
        'card-warning': '0 0 0 1px rgba(245, 158, 11, 0.6), 0 8px 30px -4px rgba(245, 158, 11, 0.2)',
        'modal': '0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.1)',
      },
      borderRadius: {
        'xl': '12px',
        'lg': '8px',
        'md': '6px',
        'sm': '4px',
      }
    },
  },
  plugins: [],
}

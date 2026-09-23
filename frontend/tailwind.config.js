/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0B0F19',
          card: '#111827',
          border: '#1F2937',
          input: '#171F2F',
          hover: '#1E293B',
          text: '#F3F4F6',
          muted: '#9CA3AF'
        },
        brand: {
          blue: '#3B82F6',
          purple: '#8B5CF6',
          cyan: '#06B6D4',
          green: '#10B981',
          emerald: '#059669'
        }
      }
    },
  },
  plugins: [],
};

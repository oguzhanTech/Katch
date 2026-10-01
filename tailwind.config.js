/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        katch: {
          bg: '#111315',
          surface: '#1A1D21',
          border: '#2A2F36',
          signal: '#E5A23A',
          muted: '#8B929A',
          text: '#E8EAED',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        katch: '6px',
      },
    },
  },
  plugins: [],
}

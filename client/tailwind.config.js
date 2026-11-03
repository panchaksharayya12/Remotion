/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        reDark: '#080c14',
        reNavy: '#0c1322',
        reSlate: '#131d31',
        reCard: '#18243c',
        reBorder: '#233454',
        reElectric: '#0070f3',
        reCyan: '#00d4ff',
        reTeal: '#0ea5e9',
        reEmerald: '#10b981',
        reAmber: '#f59e0b',
        reRose: '#f43f5e'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}

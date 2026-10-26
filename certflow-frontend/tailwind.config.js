/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Ink: text and dark surfaces, navy-biased neutrals
        ink: {
          DEFAULT: '#0F1A2B',
          800: '#1B2A41',
          700: '#2B3A52',
          600: '#42516A',
          500: '#5A6678',
          400: '#8791A1',
          300: '#B8C0CC',
        },
        // Paper: page and panel grounds, cool neutrals with a slight blue bias
        paper: {
          DEFAULT: '#F3F5F8',
          50: '#FAFBFC',
          100: '#EEF1F5',
          200: '#E0E5EC',
          300: '#CBD3DE',
        },
        // Seal: the single brand accent (verified / primary actions)
        seal: {
          50: '#E8F5F3',
          100: '#CBEBE6',
          200: '#9ED6CF',
          500: '#12877F',
          600: '#0B6F69',
          700: '#0A5753',
          800: '#083F3C',
        },
        // Foil: reserved for seals, stamps and verification marks
        foil: {
          50: '#FBF3E2',
          100: '#F5E3B8',
          400: '#D9A53A',
          500: '#C28A1B',
          600: '#9C6C10',
        },
        // Semantic status colors (kept apart from the brand accent)
        ok: { 50: '#E9F6EE', 500: '#1F8A4C', 700: '#14653A' },
        warn: { 50: '#FDF3E1', 500: '#B76E00', 700: '#8A5200' },
        bad: { 50: '#FBEAE8', 500: '#C0392B', 700: '#922B20' },
        info: { 50: '#E8F0FB', 500: '#2F66C4', 700: '#224C94' },
        // Compatibility alias so any leftover brand-* classes follow the new accent
        brand: {
          50: '#E8F5F3',
          100: '#CBEBE6',
          200: '#9ED6CF',
          500: '#12877F',
          600: '#0B6F69',
          700: '#0A5753',
          800: '#083F3C',
          900: '#062E2C',
        },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Instrument Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 2px rgba(15, 26, 43, 0.04), 0 1px 1px rgba(15, 26, 43, 0.02)',
        raise: '0 1px 2px rgba(15, 26, 43, 0.05), 0 6px 16px -6px rgba(15, 26, 43, 0.10)',
        lift: '0 2px 4px rgba(15, 26, 43, 0.04), 0 16px 32px -12px rgba(15, 26, 43, 0.18)',
        pop: '0 16px 40px -10px rgba(15, 26, 43, 0.24), 0 3px 8px rgba(15, 26, 43, 0.08)',
        glow: '0 0 0 1px rgba(18, 135, 127, 0.12), 0 8px 24px -8px rgba(18, 135, 127, 0.35)',
      },
      borderRadius: {
        panel: '12px',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'scale-in': {
          from: { opacity: '0', transform: 'translateY(-4px) scale(0.98)' },
          to: { opacity: '1', transform: 'none' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(-2deg)' },
          '50%': { transform: 'translateY(-8px) rotate(-1deg)' },
        },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        'stamp-in': {
          '0%': { opacity: '0', transform: 'scale(1.35) rotate(-12deg)' },
          '60%': { opacity: '1', transform: 'scale(0.96) rotate(2deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 420ms cubic-bezier(0.22, 1, 0.36, 1) backwards',
        'fade-in': 'fade-in 300ms ease-out backwards',
        'scale-in': 'scale-in 160ms cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.6s infinite',
        float: 'float 7s ease-in-out infinite',
        'spin-slow': 'spin-slow 60s linear infinite',
        'stamp-in': 'stamp-in 650ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
}

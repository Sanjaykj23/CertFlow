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
        panel: '0 1px 0 rgba(15, 26, 43, 0.04)',
        pop: '0 12px 32px -8px rgba(15, 26, 43, 0.22), 0 2px 6px rgba(15, 26, 43, 0.08)',
      },
      borderRadius: {
        panel: '10px',
      },
    },
  },
  plugins: [],
}

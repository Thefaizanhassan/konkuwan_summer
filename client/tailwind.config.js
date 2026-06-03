/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#162F22',
          mid: '#2B5240',
        },
        sage: '#4A7860',
        leaf: '#6A9E7A',
        earth: '#B8844A',
        cream: {
          DEFAULT: '#F4EFE6',
          dark: '#EAE3D6',
        },
        muted: '#6B7B6E',
        border: '#D8D0C4',
        ink: '#0F1A13',
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Clamp utilities can be added as custom.
      },
      borderRadius: {
        sm: '3px',
        DEFAULT: '6px',
      },
    },
  },
  plugins: [],
};
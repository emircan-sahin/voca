/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}', './electron/**/*.{ts,tsx}'],
  theme: {
    extend: {
      keyframes: {
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-down': 'slide-down 0.3s ease-out',
      },
    },
  },
  plugins: [],
};

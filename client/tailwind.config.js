/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Custom amis. brand palette
        brand: {
          bg: '#effbf5', // Pale Mint background
          dark: '#063924', // Deep Forest Green text
          primary: '#10b981', // Vibrant Circuit Green
          secondary: '#d1fae5', // Soft Mint
          gray: '#ffffff', // Pure White card background
          border: '#daefde', // Light Sage borders
        },
      },
      borderRadius: {
        DEFAULT: '0.75rem',
      },
      fontWeight: {
        bold: '700',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #0D4028 0%, #2ECC71 100%)',
        'brand-gradient-hover':
          'linear-gradient(135deg, #063924 0%, #10b981 100%)',
        'amis-gradient': 'linear-gradient(135deg, #0D4028 0%, #2ECC71 100%)',
      },
    },
  },
  plugins: [],
};

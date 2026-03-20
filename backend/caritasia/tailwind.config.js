/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
      './src/components/**/*.{js,ts,jsx,tsx,mdx}',
      './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
      extend: {
        fontFamily: {
          sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
          display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
          mono: ['JetBrains Mono', 'monospace'],
        },
        colors: {
          caritas: {
            red: '#C8102E',
            dark: '#9E0D24',
            light: '#F5E6E9',
          },
        },
        animation: {
          'fade-in-up': 'fadeInUp 0.4s ease forwards',
          'fade-in': 'fadeIn 0.3s ease forwards',
          'pulse-red': 'pulse-red 2s ease-in-out infinite',
        },
        keyframes: {
          fadeInUp: {
            from: { opacity: '0', transform: 'translateY(16px)' },
            to: { opacity: '1', transform: 'translateY(0)' },
          },
          fadeIn: {
            from: { opacity: '0' },
            to: { opacity: '1' },
          },
          'pulse-red': {
            '0%, 100%': { backgroundColor: 'rgba(200, 16, 46, 0.05)' },
            '50%': { backgroundColor: 'rgba(200, 16, 46, 0.12)' },
          },
        },
        borderRadius: {
          '2xl': '1rem',
          '3xl': '1.5rem',
        },
        boxShadow: {
          card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
          'card-hover': '0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
          modal: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)',
        },
      },
    },
    plugins: [
      require('@tailwindcss/typography'),
    ],
  };
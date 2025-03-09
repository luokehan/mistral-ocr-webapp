/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 莫兰迪色系
        morandi: {
          50: '#f8f7f6',
          100: '#e8e6e4',
          200: '#d8d3d0',
          300: '#c7c0bc',
          400: '#b5aba5',
          500: '#a59992',
          600: '#958779',
          700: '#7a7069',
          800: '#5f5652',
          900: '#433e3a',
        },
        morandiBlue: {
          100: '#dfe5e8',
          200: '#c5d0d6',
          300: '#abbbc4',
          400: '#91a5b3',
          500: '#768fa1',
        },
        morandiGreen: {
          100: '#dde5e2',
          200: '#c2d3cd',
          300: '#a7c0b9',
          400: '#8daea4',
          500: '#739c8f',
        },
        morandiPink: {
          100: '#eadad8',
          200: '#ddc3c0',
          300: '#d0ada8',
          400: '#c39790',
          500: '#b68078',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'serif'],
        display: ['Playfair Display', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'morandi': '0 4px 6px -1px rgba(169, 153, 146, 0.1), 0 2px 4px -1px rgba(169, 153, 146, 0.06)',
        'morandi-md': '0 6px 10px -1px rgba(169, 153, 146, 0.1), 0 2px 6px -1px rgba(169, 153, 146, 0.06)',
        'morandi-lg': '0 10px 15px -3px rgba(169, 153, 146, 0.1), 0 4px 6px -2px rgba(169, 153, 146, 0.05)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'float': '0 10px 50px -15px rgba(0, 0, 0, 0.1)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        'blob': '69% 31% 52% 48% / 44% 67% 33% 56%',
      },
      animation: {
        'float': 'float 5s ease-in-out infinite',
        'pulse-slow': 'pulse 5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'rotate-blob': 'rotate-blob 20s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'rotate-blob': {
          '0%': { 
            borderRadius: '69% 31% 52% 48% / 44% 67% 33% 56%',
            transform: 'rotate(0deg)',
          },
          '50%': { 
            borderRadius: '35% 65% 60% 40% / 40% 50% 50% 60%',
            transform: 'rotate(180deg)',
          },
          '100%': { 
            borderRadius: '69% 31% 52% 48% / 44% 67% 33% 56%', 
            transform: 'rotate(360deg)',
          },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'shimmer': 'linear-gradient(to right, #e5e7eb 0%, #f9fafb 50%, #e5e7eb 100%)',
      },
      typography: {
        morandi: {
          css: {
            '--tw-prose-body': 'rgb(67, 62, 58)',
            '--tw-prose-headings': 'rgb(67, 62, 58)',
            '--tw-prose-lead': 'rgb(122, 112, 105)',
            '--tw-prose-links': 'rgb(118, 143, 161)',
            '--tw-prose-bold': 'rgb(67, 62, 58)',
            '--tw-prose-counters': 'rgb(149, 135, 121)',
            '--tw-prose-bullets': 'rgb(165, 153, 146)',
            '--tw-prose-hr': 'rgb(216, 211, 208)',
            '--tw-prose-quotes': 'rgb(67, 62, 58)',
            '--tw-prose-quote-borders': 'rgb(165, 153, 146)',
            '--tw-prose-captions': 'rgb(122, 112, 105)',
            '--tw-prose-code': 'rgb(67, 62, 58)',
            '--tw-prose-pre-code': 'rgb(216, 211, 208)',
            '--tw-prose-pre-bg': 'rgb(67, 62, 58)',
            '--tw-prose-th-borders': 'rgb(199, 192, 188)',
            '--tw-prose-td-borders': 'rgb(232, 230, 228)',
          },
        },
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
} 
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        border:     'hsl(var(--border))',
        input:      'hsl(var(--input))',
        ring:       'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      keyframes: {
        'fade-in': {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        'card-in': {
          from: { opacity: 0, transform: 'translateY(12px)' },
          to:   { opacity: 1, transform: 'none' },
        },
        'float-a': {
          '0%, 100%': { transform: 'translate(0,0)' },
          '50%':      { transform: 'translate(22px,-26px)' },
        },
        'float-b': {
          '0%, 100%': { transform: 'translate(0,0)' },
          '50%':      { transform: 'translate(-20px,24px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-420px 0' },
          '100%': { backgroundPosition: '420px 0' },
        },
        sheen: {
          '0%':   { transform: 'translateX(-140%) skewX(-18deg)' },
          '100%': { transform: 'translateX(240%) skewX(-18deg)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease both',
        'card-in': 'card-in 0.45s ease both',
        'float-a': 'float-a 14s ease-in-out infinite',
        'float-a-slow': 'float-a 19s ease-in-out infinite',
        'float-b': 'float-b 17s ease-in-out infinite',
        shimmer: 'shimmer 1.4s infinite linear',
        sheen: 'sheen 3.6s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: '#eb1801',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        gold: {
          DEFAULT: '#FFD700',
          light: '#FFE55C',
          dark: '#B8860B',
        },
        purple: {
          DEFAULT: '#6A1B9A',
          light: '#9B59B6',
          dark: '#4A148C',
          indigo: '#4C1D95',
        },
        party: {
          red: '#eb1801',
          orange: '#FF6B35',
          pink: '#FF1744',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        hebrew: ['Heebo', 'Rubik', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-party': 'linear-gradient(135deg, #eb1801 0%, #FF6B35 50%, #6A1B9A 100%)',
        'gradient-night': 'linear-gradient(180deg, #1a0033 0%, #4A148C 50%, #eb1801 100%)',
        'gradient-mesh': 'radial-gradient(at 0% 0%, #eb1801 0px, transparent 50%), radial-gradient(at 100% 0%, #FF6B35 0px, transparent 50%), radial-gradient(at 100% 100%, #6A1B9A 0px, transparent 50%), radial-gradient(at 0% 100%, #FF1744 0px, transparent 50%)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'confetti-fall': {
          '0%': { transform: 'translateY(-100vh) rotate(0deg)' },
          '100%': { transform: 'translateY(100vh) rotate(360deg)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'confetti-fall': 'confetti-fall 3s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config

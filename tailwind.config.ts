import type { Config } from 'tailwindcss';

// Custom plugin added separately to fix TypeScript errors
const wazePlugin = ({ addUtilities, theme }: any) => {
  const newUtilities = {
    // Waze gradient text
    '.text-gradient-waze': {
      backgroundImage: theme('backgroundImage.text-waze'),
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent',
    },
    // Waze gradient text reverse
    '.text-gradient-waze-reverse': {
      backgroundImage: theme('backgroundImage.text-waze-reverse'),
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent',
    },
    // Waze glass effect
    '.glass-waze': {
      background: theme('backgroundImage.glass-waze'),
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
    },
    // Waze button base
    '.btn-waze': {
      background: theme('backgroundImage.waze-gradient'),
      color: 'white',
      fontWeight: '600',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: theme('boxShadow.waze-lg'),
      },
      '&:active': {
        transform: 'translateY(0)',
      },
    },
    // Waze button light
    '.btn-waze-light': {
      background: theme('backgroundImage.waze-gradient-light'),
      color: 'white',
      fontWeight: '600',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: theme('boxShadow.waze-lg'),
      },
      '&:active': {
        transform: 'translateY(0)',
      },
    },
    // Waze focus ring
    '.focus-waze': {
      '&:focus': {
        outline: '2px solid transparent',
        outlineOffset: '2px',
        boxShadow: theme('boxShadow.focus-waze'),
      },
    },
    // Hide scrollbar but keep functionality
    '.scrollbar-hide': {
      '-ms-overflow-style': 'none',
      'scrollbar-width': 'none',
      '&::-webkit-scrollbar': {
        display: 'none',
      },
    },
    // Custom scrollbar for Waze
    '.scrollbar-waze': {
      '&::-webkit-scrollbar': {
        width: '8px',
      },
      '&::-webkit-scrollbar-track': {
        background: '#f1f1f1',
        borderRadius: '10px',
      },
      '&::-webkit-scrollbar-thumb': {
        background: theme('backgroundImage.waze-gradient'),
        borderRadius: '10px',
      },
      '&::-webkit-scrollbar-thumb:hover': {
        background: theme('colors.waze.700'),
      },
    },
    // Delivery status badges
    '.badge-pickup': {
      background: theme('colors.delivery.pickup-light'),
      color: theme('colors.delivery.pickup-dark'),
      border: `1px solid ${theme('colors.delivery.pickup-dark')}`,
    },
    '.badge-delivery': {
      background: theme('colors.delivery.delivery-light'),
      color: theme('colors.delivery.delivery-dark'),
      border: `1px solid ${theme('colors.delivery.delivery-dark')}`,
    },
    '.badge-customer': {
      background: theme('colors.delivery.customer-light'),
      color: theme('colors.delivery.customer-dark'),
      border: `1px solid ${theme('colors.delivery.customer-dark')}`,
    },
    // Waze animation utilities
    '.animate-waze-pulse': {
      animation: 'waze-pulse 2s infinite',
    },
    '.animate-waze-pulse-scale': {
      animation: 'pulse-scale 2s infinite',
    },
    '.animate-waze-bounce': {
      animation: 'bounce-subtle 2s infinite',
    },
    // Glass effect utilities
    '.glass-light': {
      background: theme('backgroundImage.glass-light'),
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255, 255, 255, 0.18)',
    },
    '.glass-dark': {
      background: theme('backgroundImage.glass-dark'),
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    },
    // Map marker utilities
    '.marker-pickup': {
      backgroundColor: theme('colors.delivery.pickup'),
      borderColor: theme('colors.delivery.pickup-dark'),
    },
    '.marker-delivery': {
      backgroundColor: theme('colors.delivery.delivery'),
      borderColor: theme('colors.delivery.delivery-dark'),
    },
    '.marker-customer': {
      backgroundColor: theme('colors.delivery.customer'),
      borderColor: theme('colors.delivery.customer-dark'),
    },
    // Animation shortcuts
    '.animate-delivery-pulse': {
      animation: 'waze-pulse 2s infinite',
    },
    '.animate-route-dash': {
      animation: 'route-dash 1s linear infinite',
    },
    '.animate-marker-pulse': {
      animation: 'marker-pulse 2s ease-out infinite',
    },
  };
  addUtilities(newUtilities);
};

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        purple: {
          '50': '#faf5ff',
          '100': '#f3e8ff',
          '500': '#a855f7',
          '600': '#9333ea',
          '700': '#7e22ce',
          '800': '#6b21a8'
        },
        dark: {
          '900': '#111827',
          '950': '#030712'
        },
        gray: {
          '300': '#d1d5db',
          '500': '#6b7280',
          '700': '#374151',
          '800': '#1f2937'
        },
        // Waze Colors - Premium Gradient Palette
        waze: {
          '50': '#e6f7ff',
          '100': '#cceeff',
          '200': '#99ddff',
          '300': '#66ccff',
          '400': '#33CCFF',
          '500': '#00aaff',
          '600': '#2AA3CC',
          '700': '#1A8CB8',
          '800': '#006699',
          '900': '#004466',
          DEFAULT: '#33CCFF',
          dark: '#2AA3CC',
          darker: '#1A8CB8',
        },
        // Delivery Status Colors
        delivery: {
          pickup: '#10b981',
          'pickup-light': '#d1fae5',
          'pickup-dark': '#059669',
          delivery: '#ef4444',
          'delivery-light': '#fee2e2',
          'delivery-dark': '#dc2626',
          customer: '#3b82f6',
          'customer-light': '#dbeafe',
          'customer-dark': '#1d4ed8',
          route: '#3b82f6',
          'route-light': '#93c5fd',
          'route-dark': '#1e40af',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        }
      },
      backgroundImage: {
        'delivery-bg': "url('/delivery-bg.jpg')",
        'driver-bg': "url('/driver-bg.jpg')",
        // Waze Gradient Backgrounds
        'waze-gradient': 'linear-gradient(135deg, #33CCFF 0%, #2AA3CC 50%, #1A8CB8 100%)',
        'waze-gradient-light': 'linear-gradient(135deg, #66ddff 0%, #33CCFF 50%, #2AA3CC 100%)',
        'waze-gradient-dark': 'linear-gradient(135deg, #1A8CB8 0%, #2AA3CC 50%, #33CCFF 100%)',
        'waze-radial': 'radial-gradient(circle at center, #33CCFF 0%, #2AA3CC 70%, #1A8CB8 100%)',
        'waze-shine': 'linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
        // Glassmorphism Effects
        'glass-light': 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)',
        'glass-dark': 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(31, 41, 55, 0.85) 100%)',
        'glass-waze': 'linear-gradient(135deg, rgba(51, 204, 255, 0.15) 0%, rgba(42, 163, 204, 0.1) 100%)',
        // Text Gradients (moved here to fix duplicate)
        'text-waze': 'linear-gradient(135deg, #33CCFF 0%, #2AA3CC 50%, #1A8CB8 100%)',
        'text-waze-reverse': 'linear-gradient(135deg, #1A8CB8 0%, #2AA3CC 50%, #33CCFF 100%)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      // Premium Animations for Waze Integration
      animation: {
        // Waze-specific animations
        'waze-pulse': 'waze-pulse 2s infinite',
        'waze-pulse-fast': 'waze-pulse 1.5s infinite',
        'waze-pulse-slow': 'waze-pulse 3s infinite',
        'waze-pulse-scale': 'pulse-scale 2s infinite',
        'waze-bounce-subtle': 'bounce-subtle 2s infinite ease-in-out',
        'waze-float': 'float 6s infinite ease-in-out',
        'waze-shine': 'shine 3s infinite',
        'waze-spin': 'spin 1.5s linear infinite',
        'waze-spin-slow': 'spin 3s linear infinite',
        'waze-ping': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        
        // General animations
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
        'fade-in-down': 'fade-in-down 0.5s ease-out forwards',
        'fade-in-left': 'fade-in-left 0.5s ease-out forwards',
        'fade-in-right': 'fade-in-right 0.5s ease-out forwards',
        'slide-in-up': 'slide-in-up 0.3s ease-out forwards',
        'slide-in-down': 'slide-in-down 0.3s ease-out forwards',
        'slide-in-left': 'slide-in-left 0.3s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.3s ease-out forwards',
        'scale-in': 'scale-in 0.3s ease-out forwards',
        'scale-out': 'scale-out 0.3s ease-out forwards',
        'bounce-in': 'bounce-in 0.5s ease-out forwards',
        
        // Special effects
        'ripple': 'ripple 1s ease-out forwards',
        'confetti-fall': 'confetti-fall 3s linear forwards',
        'skeleton-loading': 'skeleton-loading 1.5s infinite',
        'gradient-shift': 'gradient-shift 3s ease infinite',
        'border-glow': 'border-glow 2s ease-in-out infinite',
        
        // Notification animations
        'notification-slide': 'notification-slide 0.3s ease-out forwards',
        'notification-pulse': 'notification-pulse 2s infinite',
        
        // Map-specific animations
        'car-drive': 'car-drive 20s linear infinite',
        'route-dash': 'route-dash 1s linear infinite',
        'marker-pulse': 'marker-pulse 2s ease-out infinite',
      },
      keyframes: {
        // Waze Premium Animations
        'waze-pulse': {
          '0%, 100%': { 
            boxShadow: '0 0 0 0 rgba(51, 204, 255, 0.7)',
            transform: 'scale(1)'
          },
          '50%': { 
            boxShadow: '0 0 0 15px rgba(51, 204, 255, 0)',
            transform: 'scale(1.05)'
          }
        },
        'pulse-scale': {
          '0%, 100%': { 
            transform: 'scale(1)',
            boxShadow: '0 10px 30px rgba(51, 204, 255, 0.4)'
          },
          '50%': { 
            transform: 'scale(1.07)',
            boxShadow: '0 15px 40px rgba(51, 204, 255, 0.6)'
          }
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' }
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '33%': { transform: 'translateY(-10px) rotate(5deg)' },
          '66%': { transform: 'translateY(-5px) rotate(-5deg)' }
        },
        'shine': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        
        // Fade animations
        'fade-in': {
          'from': { opacity: '0' },
          'to': { opacity: '1' }
        },
        'fade-in-up': {
          'from': { 
            opacity: '0',
            transform: 'translateY(20px)'
          },
          'to': { 
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        'fade-in-down': {
          'from': { 
            opacity: '0',
            transform: 'translateY(-20px)'
          },
          'to': { 
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        'fade-in-left': {
          'from': { 
            opacity: '0',
            transform: 'translateX(-20px)'
          },
          'to': { 
            opacity: '1',
            transform: 'translateX(0)'
          }
        },
        'fade-in-right': {
          'from': { 
            opacity: '0',
            transform: 'translateX(20px)'
          },
          'to': { 
            opacity: '1',
            transform: 'translateX(0)'
          }
        },
        
        // Slide animations
        'slide-in-up': {
          'from': { 
            opacity: '0',
            transform: 'translateY(100%)'
          },
          'to': { 
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        'slide-in-down': {
          'from': { 
            opacity: '0',
            transform: 'translateY(-100%)'
          },
          'to': { 
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        'slide-in-left': {
          'from': { 
            opacity: '0',
            transform: 'translateX(-100%)'
          },
          'to': { 
            opacity: '1',
            transform: 'translateX(0)'
          }
        },
        'slide-in-right': {
          'from': { 
            opacity: '0',
            transform: 'translateX(100%)'
          },
          'to': { 
            opacity: '1',
            transform: 'translateX(0)'
          }
        },
        
        // Scale animations
        'scale-in': {
          'from': { 
            opacity: '0',
            transform: 'scale(0.9)'
          },
          'to': { 
            opacity: '1',
            transform: 'scale(1)'
          }
        },
        'scale-out': {
          'from': { 
            opacity: '1',
            transform: 'scale(1)'
          },
          'to': { 
            opacity: '0',
            transform: 'scale(0.9)'
          }
        },
        
        // Bounce animations
        'bounce-in': {
          '0%': { 
            opacity: '0',
            transform: 'scale(0.3)'
          },
          '50%': { 
            opacity: '1',
            transform: 'scale(1.05)'
          },
          '70%': { 
            transform: 'scale(0.9)'
          },
          '100%': { 
            opacity: '1',
            transform: 'scale(1)'
          }
        },
        
        // Special effects
        'ripple': {
          '0%': {
            transform: 'scale(0)',
            opacity: '0.5'
          },
          '100%': {
            transform: 'scale(20)',
            opacity: '0'
          }
        },
        'confetti-fall': {
          '0%': {
            transform: 'translateY(-100vh) rotate(0deg)',
            opacity: '1'
          },
          '100%': {
            transform: 'translateY(100vh) rotate(720deg)',
            opacity: '0'
          }
        },
        'skeleton-loading': {
          '0%': {
            backgroundPosition: '-200px 0'
          },
          '100%': {
            backgroundPosition: 'calc(200px + 100%) 0'
          }
        },
        'gradient-shift': {
          '0%, 100%': {
            backgroundPosition: '0% 50%'
          },
          '50%': {
            backgroundPosition: '100% 50%'
          }
        },
        'border-glow': {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(51, 204, 255, 0.4)'
          },
          '50%': {
            boxShadow: '0 0 0 8px rgba(51, 204, 255, 0)'
          }
        },
        
        // Notification animations
        'notification-slide': {
          'from': {
            opacity: '0',
            transform: 'translateY(-20px)'
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        'notification-pulse': {
          '0%, 100%': {
            transform: 'scale(1)'
          },
          '50%': {
            transform: 'scale(1.1)'
          }
        },
        
        // Map-specific animations
        'car-drive': {
          '0%': {
            transform: 'translateX(-100px) translateY(0)'
          },
          '100%': {
            transform: 'translateX(calc(100vw + 100px)) translateY(var(--drive-offset, 0))'
          }
        },
        'route-dash': {
          '0%': {
            'stroke-dashoffset': '0'
          },
          '100%': {
            'stroke-dashoffset': '20'
          }
        },
        'marker-pulse': {
          '0%, 100%': {
            transform: 'scale(1)',
            opacity: '1'
          },
          '50%': {
            transform: 'scale(1.3)',
            opacity: '0.7'
          }
        },
      },
      // Custom Shadows for Premium Effects
      boxShadow: {
        'waze': '0 4px 20px rgba(51, 204, 255, 0.4)',
        'waze-lg': '0 10px 40px rgba(51, 204, 255, 0.5)',
        'waze-xl': '0 20px 60px rgba(51, 204, 255, 0.6)',
        'waze-inner': 'inset 0 2px 4px rgba(51, 204, 255, 0.3)',
        'glass': '0 8px 32px rgba(31, 38, 135, 0.1)',
        'glass-lg': '0 16px 64px rgba(31, 38, 135, 0.15)',
        'elevation-1': '0 1px 3px rgba(0, 0, 0, 0.12)',
        'elevation-2': '0 3px 6px rgba(0, 0, 0, 0.15)',
        'elevation-3': '0 10px 20px rgba(0, 0, 0, 0.19)',
        'elevation-4': '0 15px 30px rgba(0, 0, 0, 0.23)',
        'elevation-5': '0 20px 40px rgba(0, 0, 0, 0.27)',
        'hover': '0 10px 25px rgba(0, 0, 0, 0.1)',
        'focus-waze': '0 0 0 3px rgba(51, 204, 255, 0.3)',
      },
      // Custom Transitions
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '450': '450ms',
        '550': '550ms',
        '650': '650ms',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'accelerate': 'cubic-bezier(0.4, 0, 1, 1)',
        'decelerate': 'cubic-bezier(0, 0, 0.2, 1)',
      },
      // Custom Spacing
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem',
        '144': '36rem',
        '160': '40rem',
      },
      // Custom Font Sizes
      fontSize: {
        'xxs': '0.625rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
        '6xl': '3.75rem',
        '7xl': '4.5rem',
        '8xl': '6rem',
        '9xl': '8rem',
      },
      // Custom Line Heights
      lineHeight: {
        '11': '2.75rem',
        '12': '3rem',
        '13': '3.25rem',
        '14': '3.5rem',
        '15': '3.75rem',
      },
      // Custom Z-Indices
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
        '110': '110',
        '120': '120',
      },
      // Custom Opacity
      opacity: {
        '15': '0.15',
        '35': '0.35',
        '65': '0.65',
        '85': '0.85',
      },
      // Custom Backdrop Blur
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        '3xl': '40px',
      },
      // Custom Aspect Ratios
      aspectRatio: {
        'waze': '1 / 1',
        'waze-wide': '16 / 9',
        'waze-square': '4 / 3',
      },
      // Custom Grid Templates
      gridTemplateColumns: {
        'waze': 'repeat(auto-fit, minmax(280px, 1fr))',
        'waze-sm': 'repeat(auto-fit, minmax(200px, 1fr))',
        'waze-lg': 'repeat(auto-fit, minmax(320px, 1fr))',
      },
      // Custom Border Widths
      borderWidth: {
        '3': '3px',
        '5': '5px',
        '6': '6px',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    wazePlugin, // Add the custom plugin here directly
  ],
};

export default config;
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)"
          }
        },
        "slide-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)"
          }
        },
        "shimmer": {
          "0%": {
            backgroundPosition: "-1000px 0"
          },
          "100%": {
            backgroundPosition: "1000px 0"
          }
        },
        "blob-float-1": {
          "0%, 100%": {
            transform: "translate(0, 0) scale(1) rotate(0deg)"
          },
          "25%": {
            transform: "translate(60px, -70px) scale(1.12) rotate(5deg)"
          },
          "50%": {
            transform: "translate(-40px, 50px) scale(0.88) rotate(-3deg)"
          },
          "75%": {
            transform: "translate(50px, 60px) scale(1.08) rotate(4deg)"
          }
        },
        "blob-float-2": {
          "0%, 100%": {
            transform: "translate(0, 0) scale(1) rotate(0deg)"
          },
          "25%": {
            transform: "translate(-65px, 40px) scale(0.9) rotate(-6deg)"
          },
          "50%": {
            transform: "translate(55px, -55px) scale(1.1) rotate(5deg)"
          },
          "75%": {
            transform: "translate(-50px, -45px) scale(0.95) rotate(-4deg)"
          }
        },
        "blob-float-3": {
          "0%, 100%": {
            transform: "translate(0, 0) scale(1) rotate(0deg)"
          },
          "33%": {
            transform: "translate(45px, 65px) scale(1.15) rotate(6deg)"
          },
          "66%": {
            transform: "translate(-55px, -50px) scale(0.92) rotate(-5deg)"
          }
        },
        "subtle-pulse": {
          "0%, 100%": {
            opacity: "0.4"
          },
          "50%": {
            opacity: "0.6"
          }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-up": "slide-up 0.6s ease-out",
        "shimmer": "shimmer 2s infinite linear",
        "blob-float-1": "blob-float-1 3s ease-in-out infinite",
        "blob-float-2": "blob-float-2 3.5s ease-in-out infinite",
        "blob-float-3": "blob-float-3 2.8s ease-in-out infinite",
        "subtle-pulse": "subtle-pulse 2s ease-in-out infinite"
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

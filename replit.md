# Overview

BR ONLINE is a game server monitoring application built with React 18 and Vite. The app features a modern, animated UI with two-factor authentication using email OTP codes. It uses Firebase for authentication and database, Tailwind CSS for styling, and Resend for email delivery. The application includes smooth animations powered by Framer Motion and data visualization with Recharts.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Framework
- **React 18.2.0** - Core UI library chosen for component-based architecture and excellent ecosystem support
- **JSX/JavaScript** - Project uses JSX syntax (not TypeScript), allowing for rapid development with JavaScript flexibility
- **Vite 5.4.9** - Selected as the build tool for fast Hot Module Replacement (HMR) and optimized production builds

## Styling Approach
- **Tailwind CSS 3.4.13** - Utility-first CSS framework for rapid UI development
- **PostCSS with Autoprefixer** - Configured to process Tailwind and ensure cross-browser CSS compatibility
- **Tailwind config** - Set to scan all HTML and JSX files in the src directory for class usage

## UI Component Libraries
- **Framer Motion 11.0.0** - Animation library for smooth transitions and interactive animations
- **Lucide React 0.365.0** - Modern icon library providing consistent iconography
- **Recharts 2.12.7** - Charting library for data visualization components, suggesting the app includes analytics or reporting features

## Development Environment
- **Vite Dev Server** - Configured to run on host 0.0.0.0, port 5000 with allowed hosts for Replit compatibility
- **Source Maps** - Disabled in production builds for smaller bundle sizes
- **React Plugin** - Vite's official React plugin enabled for Fast Refresh and JSX transformation

# Recent Changes (October 2, 2025)

## Email Integration
- Integrated Resend email service for OTP delivery
- Created Express API server (port 3000) to securely handle email sending
- Resend API key is stored in environment secrets (RESEND_API_KEY) and accessed server-side only
- Frontend proxies email requests to `/api/send-otp` endpoint

## UI/UX Improvements
- Removed Firebase Extension instructional text from UI
- Enhanced animations with Framer Motion (fade-in, slide-up, scale effects)
- Added custom CSS animations (float, pulse-glow, slide-up)
- Improved visual design with better spacing, gradients, and hover effects
- Enhanced OTP card with better visual hierarchy
- Added glow effect to BR logo

# External Dependencies

## Backend Services
- **Firebase 10.12.5** - Google's Backend-as-a-Service platform used for:
  - User authentication (email/password, Google Sign-In, Play Games)
  - Firestore database for storing user data and OTP codes
  - Real-time data synchronization

- **Resend** - Email delivery service for sending OTP codes
  - API key stored in RESEND_API_KEY environment secret
  - Accessed via Express server on port 3000
  - Not exposed to client for security

## Build and Development Tools
- **Vite** - Frontend build tool and development server
- **PostCSS** - CSS processing pipeline
- **Autoprefixer** - Automatic vendor prefix addition for CSS

## UI and Visualization
- **Recharts** - Data visualization library for charts and graphs
- **Framer Motion** - Animation and gesture library
- **Lucide React** - Icon component library

## Styling
- **Tailwind CSS** - Utility-first CSS framework with custom configuration

The application follows a modern JAMstack architecture with a React frontend communicating with Firebase backend services, ideal for real-time applications with data visualization requirements.

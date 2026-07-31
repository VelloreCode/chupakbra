# Chupa K Bra - Price Monitoring Platform

## Overview
Chupa K Bra is a comprehensive price intelligence platform designed for Grupo Vellore. Its primary purpose is to monitor and compare product prices across various marketplaces and suppliers in real-time. The platform aims to enable industries and distributors to track competitiveness, analyze markets, and optimize pricing strategies. Key capabilities include automated price monitoring, historical price tracking, real-time alerts, and detailed comparison analytics.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Framework**: Shadcn/ui components (Radix UI primitives)
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod validation

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth with session management
- **API**: RESTful endpoints with role-based access control
- **Background Tasks**: Node-cron for automated price monitoring

### Key Features & Design Patterns
- **Database Schema**: Comprehensive schema including Users, Products, Prices, Categories, Clients, Competitors, Price History, Price Monitoring History, and API Keys.
- **Authentication & Authorization**: Replit Auth integration, three-tier role-based access control (admin, editor, visitor), PostgreSQL-backed session management, and API Key authentication.
- **Web Scraping System**: Hybrid approach using Cheerio for speed and Playwright for robustness, intelligent fallback, in-memory caching, asynchronous processing queue, and enhanced error handling. It supports multi-source scraping for various e-commerce platforms.
- **Price Monitoring Engine**: Automated daily cron jobs, historical price change detection, real-time alerts for price changes, and efficient bulk processing of product catalogs.
- **Data Flow**: Streamlined process from product registration (manual or URL-based) to automated scraping, price monitoring, comparison analysis, dashboard updates, and alert notifications.
- **UI/UX Decisions**: Consistent design system using Shadcn/ui and Tailwind CSS. Features like quick navigation, advanced filtering for price monitoring, and a unified product comparison view are prioritized for user experience.
- **Data Import/Export**: Robust Excel upload system with "Match Group" functionality for simplified product grouping and comparison, alongside export capabilities.

## External Dependencies

### Core
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe ORM
- **axios**: HTTP client
- **cheerio**: HTML parsing
- **playwright**: Browser automation
- **node-cron**: Task scheduling

### UI/Frontend
- **@radix-ui/***: Accessible UI component primitives
- **@tanstack/react-query**: Server state management
- **react-hook-form**: Form handling
- **zod**: Schema validation
- **tailwindcss**: CSS framework

### Development
- **tsx**: TypeScript execution
- **esbuild**: Bundler
- **vite**: Development server and build tool
# Aamir Rehman Clients Manager

## Overview

A full-stack client relationship management (CRM) web application designed for digital marketing professionals to manage clients, billing, campaigns, and invoices. The application provides a dashboard for tracking client status, payment management with monthly billing cycles, campaign tracking across advertising platforms, and invoice generation capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: Wouter for client-side routing (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state management and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: TailwindCSS with CSS custom properties for theming (light/dark mode support)
- **Forms**: React Hook Form with Zod validation schemas

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **API Design**: RESTful API endpoints under `/api/*` prefix
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **File Uploads**: Multer middleware for handling document uploads
- **Development Server**: Vite dev server with HMR, proxied through Express

### Data Layer
- **Database**: PostgreSQL (via Neon serverless driver)
- **Schema Definition**: Drizzle schema in `shared/schema.ts` with Zod validation schemas generated via drizzle-zod
- **Migrations**: Drizzle Kit for schema migrations (`npm run db:push`)

### Project Structure
```
├── client/           # Frontend React application
│   └── src/
│       ├── components/  # UI components (layout, dashboard, client management)
│       ├── pages/       # Route pages (dashboard, clients, campaigns, invoices, etc.)
│       ├── hooks/       # Custom React hooks
│       └── lib/         # Utilities and query client
├── server/           # Backend Express application
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Data access layer interface
│   └── vite.ts       # Vite dev server integration
├── shared/           # Shared code between client and server
│   └── schema.ts     # Drizzle database schema and types
└── migrations/       # Database migration files
```

### Key Design Patterns
- **Monorepo Structure**: Client, server, and shared code in single repository with path aliases
- **Type Safety**: Shared TypeScript types between frontend and backend via `@shared/*` imports
- **Component Architecture**: Compound components with shadcn/ui patterns for consistent UI
- **API Layer**: Centralized fetch wrapper in `queryClient.ts` for consistent error handling

## External Dependencies

### Database
- **PostgreSQL**: Primary database via `@neondatabase/serverless` driver
- **Connection**: Requires `DATABASE_URL` environment variable

### UI Framework Dependencies
- **Radix UI**: Complete primitive component set for accessible UI elements
- **TailwindCSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library

### Development Tools
- **Drizzle Kit**: Database schema management and migrations
- **ESBuild**: Production bundling for server code
- **TypeScript**: Full type checking across the stack

### Session Management
- **connect-pg-simple**: PostgreSQL session store (available but session handling may need implementation)

### File Handling
- **Multer**: Multipart form data parsing for file uploads
- Uploads stored in `./uploads` directory
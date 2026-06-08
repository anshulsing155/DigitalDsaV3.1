# DigitalDSA Web Application

A modern loan application platform built with SvelteKit 5, featuring secure JWT authentication, CSRF protection, and a responsive UI.

## Tech Stack

- **Framework**: SvelteKit 5 with Svelte 5 Runes
- **Language**: TypeScript
- **Database**: MongoDB
- **Authentication**: JWT (Access + Refresh tokens)
- **UI**: Tailwind CSS + Lucide Icons
- **Package Manager**: pnpm

## Prerequisites

- Node.js 18+
- pnpm
- MongoDB instance

## Setup

1. **Install dependencies**

   ```sh
   pnpm install
   ```

2. **Configure environment variables**

   Copy `.env.example` to `.env` and configure:

   ```sh
   # MongoDB
   MONGODB_URI=your_mongodb_connection_string

   # JWT Secrets
   ACCESS_TOKEN_SECRET=your_access_token_secret
   REFRESH_TOKEN_SECRET=your_refresh_token_secret

   # CSRF Protection
   CSRF_SECRET=your_csrf_secret

   # MSG91 OTP Service
   MSG91_TOKEN_AUTH=your_msg91_token
   MSG91_WIDGET_ID=your_widget_id
   ```

3. **Generate SvelteKit types**
   ```sh
   pnpm run sync
   ```

## Development

```sh
pnpm run dev
```

Opens at `http://localhost:5173`

## Production Build

```sh
pnpm run build
```

Preview production build:

```sh
pnpm run preview
```

## Type Checking

```sh
pnpm run check
```

## Project Structure

```
src/
  lib/
    components/     # Reusable UI components
    database/       # MongoDB connection & models
    services/       # JWT, email, and other services
    types/          # TypeScript type definitions
    utils/          # Utility functions & icon registry
  routes/
    (app)/          # Protected app routes
    (auth)/         # Authentication routes
    api/            # API endpoints
  hooks.server.ts   # Server hooks (auth, CSRF)
  app.d.ts          # Global type declarations
```

## Security Features

- HTTP-only cookies for JWT tokens
- CSRF protection on state-changing requests
- Secure cookie settings (SameSite=strict, Secure in production)
- Security headers (X-Frame-Options, X-Content-Type-Options, CSP)
- Input validation and sanitization

## License

Proprietary - All rights reserved

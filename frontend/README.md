
# GitTLDR Frontend

This is the web application for GitTLDR—a dashboard for repository insights, team collaboration, and AI-powered code/meeting summarization. Built with Next.js 15, React, and Tailwind CSS, it’s designed for real-world developer workflows, not just generic demos.

## Key Features

- **Modular Dashboard**: The dashboard is split into specialized cards (Notifications, Team, Shared Repositories, Q&A, etc.), each implemented as a separate component for maintainability and scalability.
- **Mobile-First Layout**: Below 450px, the dashboard switches to a single-column, stacked layout for true mobile usability. All cards and navigation adapt responsively.
- **Notification System**: Real-time notifications are fetched using React Query, not context, for reliability and scalability. Notification counts are accurate and update instantly.
- **Code & Meeting Summarization**: Integrates with backend AI services to summarize code changes and meeting transcripts. Summaries and embeddings are used together for context-aware answers in the Q&A card.
- **Drag-and-Drop Grid**: Users can rearrange dashboard cards using a drag-and-drop grid system. Card positions persist across sessions.
- **GitHub OAuth**: Secure authentication and repository access via GitHub OAuth. All API calls are protected and scoped to the user.
- **File Uploads & Sharing**: Upload files, share repositories, and manage access requests directly from the dashboard.
- **Image Optimization**: All images use Next.js `<Image />` for performance and SEO. No build warnings—this is enforced across all components.
- **Suspense Boundaries**: Pages that use `useSearchParams` or async data are wrapped in Suspense boundaries for error-free rendering (see Search and Billing pages).
- **TypeScript Everywhere**: All components, hooks, and services use strict TypeScript interfaces for safety and maintainability.

## Project Structure

```
frontend/
├── src/
│   ├── app/                # Next.js App Router (routes, layouts, pages)
│   ├── components/         # Dashboard cards, UI, layout, forms
│   ├── contexts/           # Theme, Auth, Notification providers
│   ├── hooks/              # Custom hooks (useUserData, useDashboard, etc.)
│   ├── lib/                # Utility libraries
│   ├── services/           # API clients (github, notifications, etc.)
│   ├── types/              # TypeScript types/interfaces
│   └── utils/              # Helper functions
├── public/                 # Static assets (images, icons)
├── prisma/                 # Prisma schema and migrations
└── package.json            # Scripts and dependencies
```

## Development & Setup

### Prerequisites
- Node.js 18+
- npm 9+ or yarn
- PostgreSQL 14+ (for local dev)
- Redis 6+ (for notifications)

### Quick Start
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment:
   ```bash
   cp .env.example .env.local
   # Fill in GitHub OAuth, database, Redis, and API keys
   ```
3. Migrate database:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```
4. Start development server:
   ```bash
   npm run dev
   # App at http://localhost:3000
   ```

## Scripts

- `npm run dev` – Start Next.js in development mode
- `npm run build` – Build for production
- `npm run start` – Start production server
- `npm run lint` – Lint code with Next.js ESLint
- `npm run type-check` – TypeScript type checking

## Environment Variables

See `.env.example` for all required variables (GitHub OAuth, database, API keys, etc.)

## Technical Decisions & Patterns

- **React Query for Notifications**: Switched from context to React Query for notification fetching to avoid stale data and infinite loops.
- **Suspense Boundaries**: Required for Next.js 15+ when using async params or `useSearchParams`—prevents hydration errors.
- **Component Separation**: The dashboard was refactored from a 1700+ line monolith into modular cards and layout components for maintainability.
- **Mobile Layout**: Used Tailwind breakpoints and custom logic to ensure all dashboard cards stack and remain usable on small screens.
- **Image Optimization**: Replaced all `<img>` tags with Next.js `<Image />` to resolve build warnings and improve performance.
- **TypeScript Interfaces**: All data passed between cards, hooks, and services is strictly typed for reliability.

## Contributing

Open issues or pull requests for bugs, features, or improvements. See code comments for architectural decisions and rationale.

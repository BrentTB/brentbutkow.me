# Brent Butkow Portfolio Website - Development Guidelines

## Project Overview

Personal portfolio website built with React, TypeScript, and Vite. This is a single-page application (SPA) featuring multiple content sections, and a fun "fun mode" interactive feature. The site showcases professional experience, education, projects, and contact information with a polished, interactive UI.

**Tech Stack:**

- React 18.3+ with TypeScript 5.5+
- Vite 7+ as build tool
- React Router 7+ for client-side routing
- SCSS (Sass) for styling with CSS modules
- ESLint + Prettier for code quality
- Vercel Analytics & Speed Insights integration

## Folder Structure & Purposes

### Root Level

- **package.json**: Dependencies and scripts (dev, build, lint, format, check)
- **tsconfig.json**: Main TypeScript configuration (references tsconfig.app.json and tsconfig.node.json)
- **tsconfig.app.json**: TypeScript config for application code
- **tsconfig.node.json**: TypeScript config for build tooling
- **vite.config.ts**: Vite configuration with React plugin
- **eslint.config.js**: ESLint rules and configuration
- **index.html**: HTML entry point
- **vercel.json**: Vercel deployment configuration
- **cool-effects.scss**: Global cool effect styles examples

### /src Directory Structure

**Core Files:**

- **main.tsx**: Application entry point, renders App component
- **App.tsx**: Root component wrapping routing, context providers, navbar, footer
- **index.scss**: Global styles applied across the app
- **vite-env.d.ts**: Vite environment type definitions

#### /src/routes

- **Router.tsx**: React Router component that renders configured routes
- **routes.config.tsx**: Centralized route configuration with paths and metadata
- **routes.types.ts**: TypeScript types for routes (e.g., AppRoute interface)

**Purpose:** Centralized routing logic. Routes are defined in config, making them reusable in navbar and for type safety.

#### /src/components

Reusable UI components following folder-per-component pattern (component.tsx + component.module.scss in a folder).

**Top-level:**

- **ModeToggle.tsx / ModeToggle.module.scss**: Toggle for fun mode and theme switching

**Subfolders:**

- **/cards**: Reusable card components for displaying content
  - `ArticleOrLinkCard`: Used in experience, education, fun stuff sections
  - `DetailCard`: Generic detail/fact cards
- **/effects**: Visual effects
  - `WaterRipple`: Interactive water ripple effect (shown when fun mode enabled)
- **/navbar**: Navigation header
  - `Navbar`: Main navigation component with mobile menu support, logo, and mode toggle
- **/footer**: Page footer
  - `Footer`: Persistent footer across all pages
- **/PageFormatting**: Layout wrapper components
  - `PageLayout`: Consistent page container styling
  - `PageHeader`: Standardized section header styling
- **/utils**: Utility components
  - `SafeLink`: Link component with fallback handling

#### /src/pages

Page-level components organized by route. Each page has its own folder with:

- **PageName.tsx**: Main page component
- **PageName.module.scss**: Page-specific styles
- **data.ts**: Static content/data for that page
- **/components**: Page-specific sub-components (e.g., AchievementCard, ExperienceCard)

**Available Pages:**

- **home/**: Hero section with introduction and call-to-action
- **experience/**: Professional work experience timeline
- **education/**: Educational background and certifications
- **achievements/**: Accomplishments and awards
- **fun-stuff/**: Fun projects and extra content (affected by fun mode)
- **contact-me/**: Contact information and links
- **not-found/**: 404 page for unmatched routes

#### /src/contexts

React Context API setup for global state:

- **FunMode.ts**: Context definition and hook for fun mode state
- **FunModeProvider.tsx**: Provider component that wraps the app
  - Manages fun mode state (localStorage-persisted)
  - Applies/removes `fun-mode` CSS class to document root for styling
  - Toggles visuals like WaterRipple effect

#### /src/data

Data management and types:

- **data.types.ts**: Shared TypeScript types used across pages
  - `HeroContent`: Hero section structure
  - `Project`: Project metadata type
  - `ExperienceProject`: Experience entry type
  - `HeroAction`: CTA button configuration
- **jokes.ts / jokes.json / jokes.types.ts**: Fun mode jokes/easter eggs
  - Loaded dynamically when fun mode is enabled
  - Types ensure type-safe joke data

#### /src/modes

Feature flags and mode logic:

- **fun-mode.ts**: Utilities for enabling/disabling fun mode
  - `isFunModeEnabled()`: Check if fun mode active
  - `enableFunMode()`: Enable fun mode (adds class, saves to localStorage)
  - `disableFunMode()`: Disable fun mode (removes class)

#### /src/styles

Global style utilities:

- **\_shared.scss**: Shared variables, mixins, and utility classes
  - Centralized color tokens, spacing, typography
  - Used by all component modules via `@import`

### /public

Static assets:

- **logos/**: Brand logos and image assets

## Architecture & Methodology

### Component Architecture

- **Folder per component**: Each component has its own directory with `.tsx` file, `.module.scss` file (e.g., `Button/Button.tsx` + `Button/Button.module.scss`)
- **Composition over conditionals**: Build complex UIs by composing smaller, focused components
- **Separation of concerns**: Keep presentational components pure (props-in, render) and container components handling logic/state

### State Management

- **Context API**: Fun mode state via FunModeProvider
- **localStorage**: Persists user preferences (fun mode toggle, theme)
- **Component-level state**: useState for UI state (mobile menu open/close)
- **No Redux/external store**: Simple enough for Context API

### Routing

- **Centralized config**: All routes defined in `routes.config.tsx`
- **React Router 7+**: Client-side routing with NavLink active states
- **Type-safe routes**: `AppRoute` interface ensures consistency

### Data Flow

- **Page-level data**: Each page folder contains `data.ts` with static content
- **Props-based**: Components receive data via props, no implicit globals
- **Domain types**: Shared types in `data/data.types.ts` for consistency

### Styling Approach

- **CSS Modules**: All components use `.module.scss` files for scoped styles
- **SCSS variables & mixins**: Centralized in `styles/_shared.scss`
- **Responsive design**: Mobile-first approach, responsive navbar with hamburger menu
- **Fun mode**: Additional styles applied via `fun-mode` class on document root (e.g., WaterRipple visibility)
- **Accessibility**: Focus states, contrast ratios, semantic HTML, ARIA labels

## Voice & Visuals

- **Professional with personality**: Clear typography hierarchy, confident design, distinctive accent color
- **Restrained color palette**: One bold primary color + neutral accents (avoid generic purple)
- **Subtle motion**: Use entry fades and staggered reveals sparingly
- **Smooth interactions**: Keep animations performant, respect `prefers-reduced-motion`

## Development Workflow

### Scripts

```bash
npm run dev              # Start Vite dev server (HMR enabled)
npm run build           # Compile TypeScript + Vite build
npm run lint            # Run ESLint checks
npm run check           # Full check: TypeScript + ESLint
npm run format          # Auto-format code (Prettier)
npm run format:check    # Check if formatting matches Prettier
npm run preview         # Preview production build locally
npm run prepare         # Install Husky hooks
```

### Code Quality

- **TypeScript strict mode**: No `any` types; prefer discriminated unions
- **ESLint**: Enforces React best practices and hooks rules
- **Prettier**: Consistent code formatting (configured)
- **Pre-commit hooks**: Husky ensures checks pass before commits

### Type Safety

- Define domain types in dedicated modules (`data.types.ts`, `routes.types.ts`)
- Props interfaces near components or in separate files
- Strict TypeScript configuration across all tsconfig files

## Integration & Analytics

- **Vercel Analytics**: Tracks page views and user interactions
- **Vercel Speed Insights**: Monitors Core Web Vitals
- Both enabled via environment variables (`ENABLE_VERCEL_ANALYTICS`, `ENABLE_VERCEL_SPEED_INSIGHTS`)

## Guidelines for Development

### Adding New Pages

1. Create folder in `/src/pages/page-name/`
2. Add `PageName.tsx`, `PageName.module.scss`, and `data.ts`
3. Add page-specific components in `/components` subfolder
4. Add route to `routes.config.tsx` with metadata
5. Define types in or import from `data.types.ts`

### Adding Components

1. Create folder `/src/components/ComponentName/`
2. Add `ComponentName.tsx` and `ComponentName.module.scss`
3. Prefer props over globals; keep components pure
4. Use shared styles from `styles/_shared.scss`

### Styling

- Use CSS modules (`.module.scss`) for component-scoped styles
- Import shared tokens from `_shared.scss`
- Use `fun-mode` class selector for fun mode-specific styles

### Fun Mode Feature

- Controlled by FunModeProvider context
- Persisted in localStorage
- Triggers visual changes (WaterRipple, jokes, special effects)
- Conditionally render components based on `useFunMode()` hook

## Accessibility & Performance

- **Semantic HTML**: Use proper heading hierarchy, alt text, semantic elements
- **Keyboard navigation**: Ensure all interactive elements are keyboard accessible
- **ARIA labels**: Add where semantic HTML is insufficient
- **Motion**: Respect `prefers-reduced-motion` media query
- **Performance**: Lazy load analytics, optimize images, minimize bundle size
- **Mobile-first**: Responsive design with hamburger menu for mobile

## Deployment

- Deployed on Vercel
- Environment variables configure analytics and speed insights
- Automatic builds on push to default branch
- Preview deployments for PRs

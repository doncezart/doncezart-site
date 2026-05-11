# CONVENTIONS

## Language and runtime

- JavaScript for routes, components, and server logic
- TypeScript only for Drizzle schema definitions
- Node.js runtime, SvelteKit 2

## Formatting and style

- Tabs for indentation (SvelteKit default)
- Single quotes in JS
- Component-scoped `<style>` blocks for page/component styles
- Global styles in `static/css/global.css`

## Naming conventions

- Routes: kebab-case (`my-work`, `contact`)
- Components: PascalCase (`Navbar.svelte`)
- DB tables/columns: snake_case (`password_hash`, `user_id`)

## Folder structure

- `src/lib/components/` — reusable Svelte components
- `src/lib/server/db/` — database client and schema
- `src/routes/` — SvelteKit file-based routing
- `static/` — static assets (CSS, favicons)

## Approved libraries

- `@sveltejs/kit`, `svelte`, `vite`
- `drizzle-orm`, `drizzle-kit`, `postgres`
- `@fortawesome/fontawesome-free` (Font Awesome 7)
- `@aws-sdk/client-s3` (DigitalOcean Spaces)
- `mdsvex`
- `dotenv`

## Off-limits

- (none defined yet)

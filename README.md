This is a [Next.js](https://nextjs.org) project for Mbala&Itsaka.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3100](http://localhost:3100) with your browser to see the result.

Create a local `.env.local` file using `.env.example` as the template.

Required environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Build

Run the production build locally:

```bash
npm run build
```

## Deploy on Vercel

This project is preset for Vercel with `vercel.json`.

Vercel settings:

- Framework Preset: Next.js
- Install Command: `npm install`
- Build Command: `npm run build`
- Development Command: `npm run dev`
- Output Directory: leave empty/default

Before deploying, add these Environment Variables in the Vercel project settings:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Deployment steps:

1. Push this repository to GitHub.
2. Open Vercel and choose New Project.
3. Import the GitHub repository.
4. Confirm the Next.js preset.
5. Add the Supabase environment variables.
6. Click Deploy.

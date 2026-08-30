# FastPay Admin

Desktop-first administration frontend for the FastPay platform. It uses the
separate administrator authentication and role-based endpoints exposed by the
FastPay Python backend.

The interface is built with React, Vite, TypeScript, and Tailwind CSS. FastPay
design tokens are defined with Tailwind's `@theme` configuration in
`src/styles.css`; shared components use Tailwind utilities and `@apply`, with
small custom rules retained for branded charts and complex operational layouts.

## Local development

Start the backend on port 8081, then configure and run the frontend:

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`. Create the first administrator from the backend
directory if one does not exist:

```powershell
python -m app.cli.create_admin --email admin@example.com --name "Platform Administrator"
```

## Configuration

`VITE_API_BASE_URL` is the public URL of the FastPay API. It is the only value
that belongs in the frontend environment. Never put `ADMIN_JWT_SECRET` or
`ADMIN_API_KEY` in this project; those are backend-only secrets.

For production, add the deployed admin origin to the backend's
`CORS_ORIGINS`, for example `https://admin.example.com`.

## Build and deployment

```powershell
npm run build
```

Code-quality commands:

```powershell
npm run typecheck
npm run format:check
```

Feature screens live in `src/pages`, the authenticated application frame lives
in `src/layout`, and shared session state is isolated in `src/auth-context.tsx`.

Deploy the generated `dist` directory as a static site. Configure the host to
rewrite unknown routes to `/index.html` so browser navigation works correctly.

## Available workspaces

- Role-aware overview
- User and merchant account management
- KYC identity review
- Transaction investigation
- Fraud and risk queues
- Platform analytics and trial balance
- Administrator provisioning and role management
- Privileged-action audit trail

The network-adapter panel is deliberately labelled as demo/configuration data
until the backend exposes live MNO health checks.

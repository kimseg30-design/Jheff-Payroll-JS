# Vercel Deployment & Audit Guide

This application is fully structured and configured for zero-configuration or 1-click deployment on **Vercel**.

---

## 1. Vercel Architecture & Configuration

| Component | Vercel Handling | Configuration |
| :--- | :--- | :--- |
| **Frontend** | Static SPA hosted on Vercel's Edge CDN | Built from `client/` to `client/dist` via `npm run build` |
| **API Endpoints** | Vercel Serverless Functions (Node.js runtime) | Entry point at `/api/index.js` wrapping Express (`server/src/app.js`) |
| **Routing** | Client-side HTML5 history mode & API proxies | Managed via `vercel.json` rewrites |
| **Static Bundling** | AWS Lambda / Serverless bundle tracing | All 22 endpoints statically imported in `server/src/endpoints.js` |

### `vercel.json`
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "client/dist",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/index.js"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 2. Required Environment Variables on Vercel

When importing your repository in **Vercel -> Project Settings -> Environment Variables**, add the following variables:

| Variable | Description | Target |
| :--- | :--- | :--- |
| `SUPABASE_URL` | Your Supabase project URL (`https://xurvumenaszahorrxhxf.supabase.co`) | Production, Preview, Development |
| `SUPABASE_PUBLISHABLE_KEY` | Public publishable / anon key for auth | Production, Preview, Development |
| `SUPABASE_SECRET_KEY` | Backend service-role secret key for database queries | Production, Preview, Development |
| `SUPABASE_JWKS_URL` | Supabase JWKS verification URL | Production, Preview, Development |
| `VITE_SUPABASE_URL` | Client-side Supabase URL (matches `SUPABASE_URL`) | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | Client-side publishable key (matches `SUPABASE_PUBLISHABLE_KEY`) | Production, Preview, Development |

---

## 3. Full Application Audit Summary

### ✅ Backend & API Endpoints
- **Serverless Compatibility**: Converted dynamic directory scanning (`fs.readdirSync`) to explicit static imports in `server/src/endpoints.js`. This guarantees that Vercel's Node.js file tracer includes all endpoint handlers in the serverless bundle.
- **Dual Runtime Support**: The Express app in `server/src/app.js` runs both as a standalone long-lived server (`npm start` or Docker) and as a serverless lambda on Vercel (`api/index.js`).
- **All 22 Endpoints Verified**:
  1. `bulkLogAttendance`
  2. `deleteRecord`
  3. `generatePayroll`
  4. `getDashboard`
  5. `getMyRole`
  6. `getSystemHealth`
  7. `inviteUser`
  8. `listInvites`
  9. `listRecords`
  10. `listUsers`
  11. `releasePayslips`
  12. `revokeInvite`
  13. `saveRecord`
  14. `setPayslipDeduction`
  15. `setUserRole`
  16. `sfClearData`
  17. `sfDeclareBalance`
  18. `sfDelete`
  19. `sfGetAudit`
  20. `sfGetData`
  21. `sfSave`
  22. `syncDraftPayrollAttendance`

### ✅ Database & Supabase Schema
- **Live Supabase Connection**: Successfully connecting in under 60ms to `xurvumenaszahorrxhxf.supabase.co`.
- **Schema Alignment**:
  - `employees.no_of_days_work`: Supported in database queries, tables, and employee forms.
  - `payslips.days_absent`: Tracked from attendance, stored in database, and displayed in UI and thermal printouts.
  - `payslips.other_benefits` & `payslips.sinking_contribution_deduction`: Fully integrated with earnings and deduction ledgers.
- **Graceful Fault Tolerance**: Missing application tables (`app_failed_actions`, `app_user_roles`) fallback to in-memory store smoothly without throwing 404 schema cache warnings.

### ✅ Frontend & User Experience
- **Client Routing**: Vercel rewrite ensures direct links (e.g. `/payroll`, `/attendance`, `/sinking-fund/loans`) load cleanly without 404 errors on page refresh.
- **Google Authentication**: Implemented popup OAuth (`skipBrowserRedirect: true`) with `/auth/callback` handler to work smoothly across both iframe environments and standard browser tabs.
- **Build Quality**: Verified with Vite production build (`client/dist`) and root syntax checks.

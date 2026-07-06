# Cartly — Next.js 15 Social E-Commerce Platform

A high-performance, full-stack social media and e-commerce application powered by **Next.js 15 App Router**, **Prisma ORM**, **PostgreSQL**, **Stream Chat**, and an integrated **Medusa E-Commerce Engine**.

---

## 🏗️ Project Architecture

```text
nextjs-15-social-media-app/
├── src/                      # Cartly Next.js 15 App Router Frontend
│   ├── app/                  # Application pages & API routes
│   │   ├── (auth)/           # Authentication layout & routes
│   │   ├── (main)/           # Social feed, shop hub (/shop), user profiles
│   │   └── api/              # Server-side REST API handlers
│   ├── components/           # Reusable UI components & design system
│   ├── features/
│   │   └── shop/             # Decoupled E-Commerce Feature Module
│   │       ├── components/   # Product Cards, Reviews
│   │       ├── contexts/     # CartContext, WishlistContext, RecentlyViewedContext
│   │       ├── services/     # Product, Cart, and Checkout Medusa API services
│   │       └── types/        # Provider-agnostic domain interfaces
│   └── lib/                  # Auth (Lucia), Prisma DB client, utils
├── prisma/                   # PostgreSQL schema & migration scripts
├── public/                   # Static assets & media icons
├── medusa/                   # Medusa E-Commerce Engine Backend Service
│   ├── server.js             # Medusa Store REST API server (Port 9000)
│   └── package.json          # Medusa backend configuration & scripts
├── README.md                 # Project documentation & setup guide
└── package.json              # Single-command launcher & workspace scripts
```

---

## 🚀 Single-Command Development Setup

You can run both the **Cartly Next.js Frontend** and **Medusa Backend** concurrently using a single command:

```bash
npm run dev
```

### Prefix Logging
When running `npm run dev`, `concurrently` outputs distinct, color-coded prefixes for easy debugging:
- **`[WEB]`** (Cyan): Next.js Frontend server running at `http://localhost:3000`
- **`[MEDUSA]`** (Magenta): Medusa E-Commerce Engine running at `http://localhost:9000`

---

## 🛠️ Individual Development Scripts

If you want to run services independently in separate terminals:

| Command | Description |
|---|---|
| `npm run dev` | Launch both Next.js Frontend and Medusa Backend concurrently |
| `npm run dev:web` | Run only the Cartly Next.js 15 Frontend (`localhost:3000`) |
| `npm run dev:medusa` | Run only the Medusa Backend Engine (`localhost:9000`) |
| `npm run build` | Build the Next.js production bundle |
| `npm run start` | Start Next.js production server |
| `npm run lint` | Run ESLint across code workspace |

---

## ⚙️ Environment Variables

### Root `.env` (Cartly Frontend)
```env
# Database & Authentication
DATABASE_URL="postgresql://user:password@localhost:5432/cartly_db"
POSTGRES_PRISMA_URL="postgresql://user:password@localhost:5432/cartly_db?pgbouncer=true"

# Commerce Backend Connection
NEXT_PUBLIC_MEDUSA_BACKEND_URL="http://localhost:9000"

# Stream Chat & Uploadthing
NEXT_PUBLIC_STREAM_KEY="your_stream_key"
STREAM_SECRET="your_stream_secret"
UPLOADTHING_SECRET="your_uploadthing_secret"
UPLOADTHING_APP_ID="your_uploadthing_app_id"
```

### `medusa/.env` (Medusa Backend)
```env
PORT=9000
NODE_ENV=development
```

---

## 🔮 Scalability & Future Expansion

The repository setup is structured for long-term scalability:
- **Adding an AI Service**: Create `apps/ai-service` or `ai-service/` as a sibling directory and add `"npm --prefix ai-service run dev"` to the root `concurrently` command in `package.json`.
- **Adding a Background Worker**: Create `worker/` as a sibling directory and execute `npm run worker`.

---

## 📄 License
Private & Proprietary. All Rights Reserved.

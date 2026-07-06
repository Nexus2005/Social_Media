import ky from "ky";

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";

export const medusaClient = ky.create({
  prefixUrl: `${MEDUSA_URL}/store`,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  // Ensure we pass cookies / sessions (useful for Medusa session cart tracking)
  credentials: "include",
});

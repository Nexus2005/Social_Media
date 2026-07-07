// Dynamic Location Resolver for Cartly Shop
import { cookies } from "next/headers";

const DEFAULT_COUNTRY = "us";
const COOKIE_NAME = "cartly_country_code";

/**
 * Resolves the country code in a Server Component or Route Handler.
 * Fallbacks: Cookies -> Headers -> Default ("us")
 */
export async function resolveServerCountryCode(): Promise<string> {
  try {
    // 1. Check Cookie
    const cookieStore = await cookies();
    const cookieVal = cookieStore.get(COOKIE_NAME)?.value;
    if (cookieVal && cookieVal.length === 2) {
      return cookieVal.toLowerCase();
    }

    // 2. Check Geo headers (e.g. Vercel or Cloudflare)
    // We cannot read headers directly here without 'headers' import, but we can do a try-catch.
    const { headers } = await import("next/headers");
    const headersList = await headers();
    const geoCountry = 
      headersList.get("x-vercel-ip-country") || 
      headersList.get("x-country-code") ||
      headersList.get("cf-ipcountry");
      
    if (geoCountry && geoCountry.length === 2) {
      return geoCountry.toLowerCase();
    }
  } catch (error) {
    console.warn("Error resolving server country code:", error);
  }

  return DEFAULT_COUNTRY;
}

/**
 * Resolves the country code on the client side.
 */
export function resolveClientCountryCode(): string {
  if (typeof window === "undefined") {
    return DEFAULT_COUNTRY;
  }

  try {
    const value = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${COOKIE_NAME}=`))
      ?.split("=")[1];

    if (value && value.length === 2) {
      return value.toLowerCase();
    }
  } catch (e) {
    console.warn("Error resolving client country code from cookies:", e);
  }

  return DEFAULT_COUNTRY;
}

/**
 * Sets the active country code cookie.
 */
export function setClientCountryCode(countryCode: string): void {
  if (typeof window === "undefined") return;
  try {
    const maxAge = 60 * 60 * 24 * 365; // 1 year
    document.cookie = `${COOKIE_NAME}=${countryCode.toLowerCase()}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch (e) {
    console.error("Failed to set country code cookie:", e);
  }
}

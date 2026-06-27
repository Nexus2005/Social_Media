import { NextResponse } from "next/server";

export async function GET() {
  return new NextResponse("Impact-Site-Verification: 065bee49-82d2-48ec-975f-501f037968d7", {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  throw new Error("Sentry Test Exception: Verification Successful");
}

import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { apiError } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return NextResponse.json({ authenticated: await isAuthenticated() });
  } catch (e) {
    return apiError(e);
  }
}

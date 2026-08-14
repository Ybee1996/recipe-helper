import { NextResponse } from "next/server";
import { loadOverlays } from "@/lib/user-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(loadOverlays());
}

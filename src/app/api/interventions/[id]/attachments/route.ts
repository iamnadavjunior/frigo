import { NextResponse } from "next/server";

// Attachments have been removed from this system.
export async function POST() {
  return NextResponse.json({ error: "Attachments are no longer supported" }, { status: 410 });
}

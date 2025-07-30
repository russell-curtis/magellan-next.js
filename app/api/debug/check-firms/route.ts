import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { firms, users, userSetupStatus } from "@/db/schema";

export async function GET(request: NextRequest) {
  try {
    const allFirms = await db.select().from(firms);
    const allUsers = await db.select().from(users);
    const allSetupStatus = await db.select().from(userSetupStatus);

    return NextResponse.json({
      firms: allFirms,
      users: allUsers,
      setupStatus: allSetupStatus,
    });
  } catch (error) {
    console.error("Error fetching debug data:", error);
    return NextResponse.json(
      { error: "Failed to fetch debug data" },
      { status: 500 }
    );
  }
}
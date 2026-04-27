import { NextResponse } from "next/server";
import { cleanupExpired } from "@/lib/mail";

export async function GET() {
    try {
        const cleaned = await cleanupExpired();
        return NextResponse.json({
            success: true,
            cleaned,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        return NextResponse.json(
            { error: "Cleanup failed" },
            { status: 500 }
        );
    }
}

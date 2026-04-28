import { NextResponse } from "next/server";
import { db, schema } from "@/db";

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    
    // Optional: Protect cron route if CRON_SECRET is set
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        // Reset generationCountToday for all users
        await db.update(schema.users).set({ generationCountToday: 0 });
        
        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        return NextResponse.json(
            { error: "Reset failed" },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from "next/server";
import { registerUser, loginUser, logout, getSession } from "@/lib/auth";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ authenticated: false });
        }

        const user = await db
            .select({
                id: schema.users.id,
                email: schema.users.email,
                plan: schema.users.plan,
                generationCountToday: schema.users.generationCountToday,
                vipUntil: schema.users.vipUntil,
            })
            .from(schema.users)
            .where(eq(schema.users.id, session.userId))
            .get();

        return NextResponse.json({
            authenticated: true,
            user,
        });
    } catch (error) {
        return NextResponse.json({ authenticated: false });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, email, password } = body;

        if (action === "register") {
            if (!email || !password) {
                return NextResponse.json(
                    { error: "Email dan kata sandi diperlukan" },
                    { status: 400 }
                );
            }
            const ipAddress = req.headers.get("x-forwarded-for") || null;
            const userAgent = req.headers.get("user-agent") || null;
            const result = await registerUser(email, password, ipAddress, userAgent);
            if (!result.success) {
                return NextResponse.json({ error: result.error }, { status: 400 });
            }
            return NextResponse.json({ success: true, userId: result.userId });
        }

        if (action === "login") {
            if (!email || !password) {
                return NextResponse.json(
                    { error: "Email dan kata sandi diperlukan" },
                    { status: 400 }
                );
            }
            const ipAddress = req.headers.get("x-forwarded-for") || null;
            const userAgent = req.headers.get("user-agent") || null;
            const result = await loginUser(email, password, ipAddress, userAgent);
            if (!result.success) {
                return NextResponse.json({ error: result.error }, { status: 400 });
            }
            return NextResponse.json({ success: true, userId: result.userId });
        }

        if (action === "logout") {
            await logout();
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        return NextResponse.json(
            { error: "Terjadi kesalahan" },
            { status: 500 }
        );
    }
}

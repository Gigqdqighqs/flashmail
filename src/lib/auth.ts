import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "firemail-dev-secret"
);
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function createSession(userId: string, ipAddress?: string | null, userAgent?: string | null): Promise<string> {
    const sessionId = nanoid(32);
    const expiresAt = new Date(Date.now() + SESSION_DURATION);

    await db.insert(schema.sessions).values({
        id: sessionId,
        userId,
        expiresAt,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
    });

    const token = await new SignJWT({ sessionId, userId })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime(expiresAt)
        .sign(JWT_SECRET);

    const cookieStore = await cookies();
    cookieStore.set("session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: expiresAt,
        path: "/",
    });

    return sessionId;
}

export async function getSession(): Promise<{
    userId: string;
    sessionId: string;
} | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const sessionId = payload.sessionId as string;
        const userId = payload.userId as string;

        // Verify session exists in DB
        const session = await db
            .select()
            .from(schema.sessions)
            .where(eq(schema.sessions.id, sessionId))
            .get();

        if (!session || session.expiresAt < new Date()) {
            return null;
        }

        return { userId, sessionId };
    } catch {
        return null;
    }
}

// Removed getOrCreateGuestUser to enforce login per specification

export async function registerUser(
    email: string,
    password: string,
    ipAddress?: string | null,
    userAgent?: string | null
): Promise<{ success: boolean; error?: string; userId?: string }> {
    const existing = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .get();

    if (existing) {
        return { success: false, error: "Email sudah terdaftar" };
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = nanoid(16);

    await db.insert(schema.users).values({
        id: userId,
        email,
        passwordHash,
        plan: "free",
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
    });

    await createSession(userId, ipAddress, userAgent);
    return { success: true, userId };
}

export async function loginUser(
    email: string,
    password: string,
    ipAddress?: string | null,
    userAgent?: string | null
): Promise<{ success: boolean; error?: string; userId?: string }> {
    const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .get();

    if (!user || !user.passwordHash) {
        return { success: false, error: "Email atau kata sandi salah" };
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
        return { success: false, error: "Email atau kata sandi salah" };
    }

    await createSession(user.id, ipAddress, userAgent);
    return { success: true, userId: user.id };
}

export async function logout(): Promise<void> {
    const session = await getSession();
    if (session) {
        await db
            .delete(schema.sessions)
            .where(eq(schema.sessions.id, session.sessionId));
    }
    const cookieStore = await cookies();
    cookieStore.delete("session");
}

export async function getUserPlan(
    userId: string
): Promise<string> {
    const user = await db
        .select({ plan: schema.users.plan })
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .get();
    return user?.plan || "free";
}

export async function getFullUser(userId: string) {
    return await db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
}

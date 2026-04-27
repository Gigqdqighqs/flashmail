import { google } from "@/lib/oauth";
import { cookies } from "next/headers";
import { OAuth2Tokens } from "arctic";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createSession } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest): Promise<Response> {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    const cookieStore = await cookies();
    const storedState = cookieStore.get("google_oauth_state")?.value ?? null;
    const storedCodeVerifier = cookieStore.get("google_oauth_code_verifier")?.value ?? null;

    if (!code || !state || !storedState || !storedCodeVerifier || state !== storedState) {
        return new Response(null, {
            status: 400
        });
    }

    try {
        const tokens: OAuth2Tokens = await google.validateAuthorizationCode(code, storedCodeVerifier);
        const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
            headers: {
                Authorization: `Bearer ${tokens.accessToken()}`
            }
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Failed to fetch user info: ${response.status} ${errBody}`);
        }

        const googleUser: { sub: string, email: string } = await response.json();

        // Check if user already exists
        const existingUser = await db.select().from(schema.users).where(eq(schema.users.googleId, googleUser.sub)).get();

        const ipAddress = request.headers.get("x-forwarded-for") || null;
        const userAgent = request.headers.get("user-agent") || null;

        if (existingUser) {
            await createSession(existingUser.id, ipAddress, userAgent);
            return Response.redirect(new URL("/dashboard", request.url));
        }

        // Also check if email already exists but not linked with Google
        const userByEmail = await db.select().from(schema.users).where(eq(schema.users.email, googleUser.email)).get();

        let userId = "";

        if (userByEmail) {
            // Link Google ID
            await db.update(schema.users).set({ googleId: googleUser.sub }).where(eq(schema.users.id, userByEmail.id));
            userId = userByEmail.id;
        } else {
            // Create new user
            userId = nanoid(16);
            await db.insert(schema.users).values({
                id: userId,
                googleId: googleUser.sub,
                email: googleUser.email,
                plan: "free",
            });
        }

        await createSession(userId, ipAddress, userAgent);
        return Response.redirect(new URL("/dashboard", request.url));
    } catch (e) {
        console.error("Google Auth Error:", e);
        if (e instanceof Error) {
            return new Response(e.message, { status: 400 });
        }
        return new Response(null, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { getSession } from "@/lib/auth";
import crypto from "crypto";

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session?.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const planTarget = body.plan || "basic";

        let price = 25000;
        if (planTarget === "pro") price = 50000;

        const userId = session.userId;
        const invoiceId = `FM-PAY-${userId.slice(0, 5)}-${Date.now().toString().slice(-6)}`;
        const txId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();

        await db.insert(schema.transactions).values({
            id: txId,
            userId: userId,
            amount: price,
            status: "PENDING",
            invoiceId: invoiceId,
            qrisString: "URL_REDIRECT" // Marker to know it's a URL-based checkout
        });

        const slug = process.env.PAKASIR_SLUG || "flashmail";
        const redirectUrl = `https://app.pakasir.com/pay/${slug}/${price}?order_id=${invoiceId}&qris_only=1`;

        return NextResponse.json({ success: true, redirectUrl, invoiceId, amount: price });

    } catch (error) {
        console.error("API_PAYMENT_QRIS_ERROR:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

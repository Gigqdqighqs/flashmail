import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
    try {
        const rawBody = await request.text();
        if (!rawBody) return NextResponse.json({ error: "Empty body" }, { status: 400 });

        let payload;
        try { payload = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

        const invoiceId = payload?.order_id;
        if (!invoiceId || !invoiceId.startsWith("FM-PAY")) {
            return NextResponse.json({ error: "Bukan transaksi pembayaran FlashMail" }, { status: 200 });
        }

        const tx = await db.select().from(schema.transactions).where(eq(schema.transactions.invoiceId, invoiceId)).get();
        if (!tx) return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
        if (tx.status === "SUCCESS") return NextResponse.json({ success: true, message: "Sudah diproses" });

        const paymentStatus = payload?.status || "completed";

        if (paymentStatus === "expired" || paymentStatus === "failed") {
            await db.update(schema.transactions).set({ status: 'FAILED', updatedAt: new Date() }).where(eq(schema.transactions.invoiceId, invoiceId));
            return NextResponse.json({ success: true, message: "Transaksi Dibatalkan/Gagal" });
        }

        if (paymentStatus === "completed") {
            let planStr = "basic";
            if (tx.amount === 25000) planStr = "basic";
            if (tx.amount === 50000) planStr = "pro";

            const now = new Date();
            const vipUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

            await db.update(schema.transactions).set({ status: 'SUCCESS', updatedAt: new Date() }).where(eq(schema.transactions.invoiceId, invoiceId));
            await db.update(schema.users).set({ plan: planStr as any, vipUntil }).where(eq(schema.users.id, tx.userId));
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("WEBHOOK_ERROR:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

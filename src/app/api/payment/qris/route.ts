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

        // In a real production app these should be configured properly per environment
        // For this implementation, we simulate the logic as implemented in nimestation.
        const isProduction = process.env.DOKU_IS_PRODUCTION === "true";
        const clientId = process.env.DOKU_CLIENT_ID || "TEST-CLIENT-ID";
        const rawPrivateKey = process.env.DOKU_PRIVATE_KEY || "";
        const privateKey = rawPrivateKey.replace(/\\n/g, '\n');
        const secretKey = process.env.DOKU_SECRET_KEY || "TEST-SECRET-KEY";
        const merchantId = process.env.DOKU_MERCHANT_ID || "TEST-MERCHANT-ID";

        // Determine exact pricing based on plan input or predefined
        const body = await request.json();
        const planTarget = body.plan || "basic";
        let price = 20000;
        if (planTarget === "pro") price = 50000;
        if (planTarget === "unlimited") price = 100000;

        const baseUrl = isProduction ? "https://api.doku.com" : "https://api-sandbox.doku.com";

        const userId = session.userId;
        const generateIso8601Timestamp = () => {
            const now = new Date();
            const pad = (n: number) => (n < 10 ? '0' + n : n);
            const tzo = -now.getTimezoneOffset();
            const dif = tzo >= 0 ? '+' : '-';
            return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) +
                'T' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds()) +
                dif + pad(Math.floor(Math.abs(tzo) / 60)) + ':' + pad(Math.abs(tzo) % 60);
        };

        const timestamp = generateIso8601Timestamp();
        const b2bSignature = crypto.createSign('RSA-SHA256').update(`${clientId}|${timestamp}`).sign(privateKey, 'base64');

        // In development or when private key is invalid, we return dummy QR so frontend can be tested
        if (!rawPrivateKey || rawPrivateKey === "") {
            const dummyInvoice = `NS-VIPR-${userId}-${Date.now().toString().slice(-6)}`;
            const txId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
            await db.insert(schema.transactions).values({
                id: txId,
                userId: userId,
                amount: price,
                status: "PENDING",
                invoiceId: dummyInvoice,
                qrisString: "000201010212260000GUMMIES00ID"
            });
            return NextResponse.json({ success: true, invoiceId: dummyInvoice, qrContent: "000201010212260000GUMMIES00ID", amount: price });
        }

        const tokenRes = await fetch(`${baseUrl}/authorization/v1/access-token/b2b`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CLIENT-KEY": clientId,
                "X-TIMESTAMP": timestamp,
                "X-SIGNATURE": b2bSignature,
            },
            body: JSON.stringify({ grantType: "client_credentials" }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok || !tokenData.accessToken) {
            return NextResponse.json({ error: "Gagal mendapatkan akses token pembayaran", details: tokenData }, { status: 500 });
        }

        const accessToken = tokenData.accessToken;
        const invoiceId = `NS-VIPR-${userId}-${Date.now().toString().slice(-6)}`;

        const qrPath = "/snap-adapter/b2b/v1.0/qr/qr-mpm-generate";
        const qrBodyObj = {
            partnerReferenceNo: invoiceId,
            amount: { value: price.toFixed(2), currency: "IDR" },
            merchantId: merchantId,
            terminalId: "A01",
            additionalInfo: { postalCode: "12190", feeType: "1", targetPlan: planTarget }
        };

        const qrBodyStr = JSON.stringify(qrBodyObj);
        const qrTimestamp = new Date().toISOString().split('.')[0] + 'Z';
        const hashBody = crypto.createHash('sha256').update(qrBodyStr).digest('hex').toLowerCase();
        const qrSignature = crypto.createHmac('sha512', secretKey).update(`POST:${qrPath}:${accessToken}:${hashBody}:${qrTimestamp}`).digest('base64');

        const qrRes = await fetch(`${baseUrl}${qrPath}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`,
                "X-CLIENT-KEY": clientId,
                "X-TIMESTAMP": qrTimestamp,
                "X-SIGNATURE": qrSignature,
                "X-PARTNER-ID": clientId,
                "X-EXTERNAL-ID": invoiceId,
                "CHANNEL-ID": "H2H"
            },
            body: qrBodyStr,
        });

        const qrData = await qrRes.json();
        if (!qrRes.ok || !qrData.qrContent) {
            return NextResponse.json({ error: "Gagal generate QRIS" }, { status: 500 });
        }

        const txId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
        await db.insert(schema.transactions).values({
            id: txId,
            userId: userId,
            amount: price,
            status: "PENDING",
            invoiceId: invoiceId,
            qrisString: qrData.qrContent
        });

        return NextResponse.json({ success: true, invoiceId, qrContent: qrData.qrContent, amount: price });

    } catch (error) {
        console.error("API_PAYMENT_QRIS_ERROR:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

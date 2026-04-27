import { NextRequest, NextResponse } from "next/server";
import { saveInboundEmail } from "@/lib/mail";

export async function POST(req: NextRequest) {
    try {
        // Verify inbound secret
        const auth = req.headers.get("authorization");
        const expectedSecret = `Bearer ${process.env.INBOUND_SECRET}`;

        if (auth !== expectedSecret) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { from, to, fromName, subject, bodyText, bodyHtml } = body;

        if (!from || !to) {
            return NextResponse.json(
                { error: "Missing from or to field" },
                { status: 400 }
            );
        }

        const saved = await saveInboundEmail({
            from,
            to: to.toLowerCase(),
            fromName,
            subject,
            bodyText,
            bodyHtml,
        });

        if (!saved) {
            return NextResponse.json(
                { error: "Mailbox not found or inactive" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Inbound email error:", error);
        return NextResponse.json(
            { error: "Failed to process inbound email" },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createMailbox, getUserMailboxes, deleteMailbox } from "@/lib/mail";

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ mailboxes: [] });
        }
        const mailboxes = await getUserMailboxes(session.userId);
        return NextResponse.json({ mailboxes });
    } catch (error) {
        return NextResponse.json({ error: "Gagal memuat mailbox" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        let customAlias, customExpiryHours;
        try {
            const body = await req.json();
            customAlias = body.customAlias;
            customExpiryHours = body.customExpiryHours;
        } catch (e) {
            // body might be empty
        }

        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Kamu harus login untuk membuat email sementara." }, { status: 401 });
        }

        const result = await createMailbox(session.userId, customAlias, customExpiryHours);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ mailbox: result.mailbox }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Gagal membuat mailbox" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { mailboxId } = await req.json();
        await deleteMailbox(session.userId, mailboxId);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Gagal menghapus mailbox" }, { status: 500 });
    }
}

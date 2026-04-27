import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMailboxEmails, getEmailDetail, deleteEmail } from "@/lib/mail";

export async function GET(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const mailboxId = searchParams.get("mailbox");
        const emailId = searchParams.get("id");

        if (emailId) {
            const email = await getEmailDetail(emailId, session.userId);
            if (!email) {
                return NextResponse.json({ error: "Email tidak ditemukan" }, { status: 404 });
            }
            return NextResponse.json({ email: email.email });
        }

        if (mailboxId) {
            const emails = await getMailboxEmails(mailboxId, session.userId);
            if (emails === null) {
                return NextResponse.json({ error: "Mailbox tidak ditemukan" }, { status: 404 });
            }
            return NextResponse.json({ emails });
        }

        return NextResponse.json({ error: "Parameter mailbox atau id diperlukan" }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: "Gagal memuat email" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { emailId } = await req.json();
        const result = await deleteEmail(emailId, session.userId);

        if (!result) {
            return NextResponse.json({ error: "Email tidak ditemukan" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Gagal menghapus email" }, { status: 500 });
    }
}

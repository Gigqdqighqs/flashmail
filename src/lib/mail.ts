import { db, schema } from "@/db";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getUserPlan, getFullUser } from "./auth";

const MAIL_DOMAIN = process.env.MAIL_DOMAIN || "flashmail.qzz.io";
const FREE_MAX_MAILBOXES = 3;
const FREE_EXPIRY_HOURS = 2;
const VIP_EXPIRY_HOURS = 168; // 7 days

function generateAddress(): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const prefixLen = 8 + Math.floor(Math.random() * 4); // 8-11 chars
    let prefix = "";
    for (let i = 0; i < prefixLen; i++) {
        prefix += chars[Math.floor(Math.random() * chars.length)];
    }
    return `${prefix}@${MAIL_DOMAIN}`;
}

export async function createMailbox(
    userId: string,
    customAlias?: string,
    customExpiryHours?: number
): Promise<{ success: boolean; mailbox?: typeof schema.mailboxes.$inferSelect; error?: string }> {
    const user = await getFullUser(userId);
    if (!user) return { success: false, error: "User tidak ditemukan" };

    const plan = user.plan;
    const isPremium = plan !== "free";

    // Limits
    let dailyLimit = 3;
    if (plan === "basic") dailyLimit = 250;
    if (plan === "pro") dailyLimit = 500;
    if (plan === "unlimited" || plan === "vip") dailyLimit = 999999;

    if (user.generationCountToday >= dailyLimit) {
        return {
            success: false,
            error: `Batas maksimal harian tercapai (${dailyLimit} email). Silakan upgrade paket kamu jika butuh lebih banyak.`,
        };
    }

    if (!isPremium && user.generationCountToday >= 3) {
        return {
            success: false,
            error: "Batas 3 email harian untuk free plan telah tercapai. Upgrade ke VIP untuk membuat lebih banyak.",
        };
    }

    let address = generateAddress();
    if (isPremium && customAlias) {
        // Validate alias format
        const cleanAlias = customAlias.trim().toLowerCase().replace(/[^a-z0-9-.]/g, "");
        if (cleanAlias.length < 3) return { success: false, error: "Alias minimal 3 karakter" };
        address = `${cleanAlias}@${MAIL_DOMAIN}`;
    }

    // Check if address exists
    const existing = await db.select().from(schema.mailboxes).where(eq(schema.mailboxes.address, address)).get();
    if (existing) {
        return { success: false, error: "Alamat email ini sudah digunakan oleh orang lain" };
    }

    const DEFAULT_PREMIUM_EXPIRY = 24;
    const expiryHours = isPremium ? (customExpiryHours || DEFAULT_PREMIUM_EXPIRY) : FREE_EXPIRY_HOURS;

    const mailbox = {
        id: nanoid(16),
        userId,
        address,
        isActive: true,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + expiryHours * 60 * 60 * 1000),
    };

    await db.insert(schema.mailboxes).values(mailbox);
    await db.update(schema.users).set({ generationCountToday: user.generationCountToday + 1 }).where(eq(schema.users.id, userId));
    return { success: true, mailbox: mailbox as typeof schema.mailboxes.$inferSelect };
}

export async function getUserMailboxes(userId: string) {
    return db
        .select()
        .from(schema.mailboxes)
        .where(
            and(
                eq(schema.mailboxes.userId, userId),
                eq(schema.mailboxes.isActive, true)
            )
        )
        .orderBy(desc(schema.mailboxes.createdAt))
        .all();
}

export async function deleteMailbox(
    userId: string,
    mailboxId: string
): Promise<boolean> {
    const result = await db
        .update(schema.mailboxes)
        .set({ isActive: false })
        .where(
            and(
                eq(schema.mailboxes.id, mailboxId),
                eq(schema.mailboxes.userId, userId)
            )
        );
    return true;
}

export async function getMailboxEmails(mailboxId: string, userId: string) {
    // Verify ownership
    const mailbox = await db
        .select()
        .from(schema.mailboxes)
        .where(
            and(
                eq(schema.mailboxes.id, mailboxId),
                eq(schema.mailboxes.userId, userId)
            )
        )
        .get();

    if (!mailbox) return null;

    return db
        .select()
        .from(schema.emails)
        .where(eq(schema.emails.mailboxId, mailboxId))
        .orderBy(desc(schema.emails.receivedAt))
        .all();
}

export async function getEmailDetail(emailId: string, userId: string) {
    const email = await db
        .select({
            email: schema.emails,
            mailbox: schema.mailboxes,
        })
        .from(schema.emails)
        .innerJoin(
            schema.mailboxes,
            eq(schema.emails.mailboxId, schema.mailboxes.id)
        )
        .where(
            and(
                eq(schema.emails.id, emailId),
                eq(schema.mailboxes.userId, userId)
            )
        )
        .get();

    if (!email) return null;

    // Mark as read
    await db
        .update(schema.emails)
        .set({ isRead: true })
        .where(eq(schema.emails.id, emailId));

    return email;
}

export async function saveInboundEmail(data: {
    to: string;
    from: string;
    fromName?: string;
    subject?: string;
    bodyText?: string;
    bodyHtml?: string;
}): Promise<boolean> {
    // Find mailbox by address
    const mailbox = await db
        .select()
        .from(schema.mailboxes)
        .where(
            and(
                eq(schema.mailboxes.address, data.to.toLowerCase()),
                eq(schema.mailboxes.isActive, true)
            )
        )
        .get();

    if (!mailbox) return false;

    await db.insert(schema.emails).values({
        id: nanoid(16),
        mailboxId: mailbox.id,
        fromAddress: data.from,
        fromName: data.fromName || "",
        subject: data.subject || "(No Subject)",
        bodyText: data.bodyText || "",
        bodyHtml: data.bodyHtml || "",
        isRead: false,
        receivedAt: new Date(),
    });

    return true;
}

export async function deleteEmail(
    emailId: string,
    userId: string
): Promise<boolean> {
    const email = await db
        .select({
            email: schema.emails,
            mailbox: schema.mailboxes,
        })
        .from(schema.emails)
        .innerJoin(
            schema.mailboxes,
            eq(schema.emails.mailboxId, schema.mailboxes.id)
        )
        .where(
            and(
                eq(schema.emails.id, emailId),
                eq(schema.mailboxes.userId, userId)
            )
        )
        .get();

    if (!email) return false;

    await db.delete(schema.emails).where(eq(schema.emails.id, emailId));
    return true;
}

export async function cleanupExpired(): Promise<number> {
    const now = new Date();

    // Get expired mailboxes
    const expired = await db
        .select({ id: schema.mailboxes.id })
        .from(schema.mailboxes)
        .where(eq(schema.mailboxes.isActive, true))
        .all();

    let cleaned = 0;
    for (const mb of expired) {
        const mailbox = await db
            .select()
            .from(schema.mailboxes)
            .where(eq(schema.mailboxes.id, mb.id))
            .get();

        if (mailbox && mailbox.expiresAt < now) {
            // Delete emails first
            await db
                .delete(schema.emails)
                .where(eq(schema.emails.mailboxId, mb.id));
            // Deactivate mailbox
            await db
                .update(schema.mailboxes)
                .set({ isActive: false })
                .where(eq(schema.mailboxes.id, mb.id));
            cleaned++;
        }
    }

    // Clean old sessions
    await db.delete(schema.sessions).where(eq(schema.sessions.expiresAt, now));

    return cleaned;
}

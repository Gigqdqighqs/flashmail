import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
    id: text("id").primaryKey(),
    googleId: text("google_id").unique(),
    email: text("email").unique(),
    passwordHash: text("password_hash"),
    plan: text("plan", { enum: ["free", "basic", "pro", "unlimited", "vip"] })
        .notNull()
        .default("free"),
    generationCountToday: integer("generation_count_today").notNull().default(0),
    vipUntil: integer("vip_until", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const transactions = sqliteTable("transactions", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    status: text("status").notNull().default("PENDING"),
    invoiceId: text("invoice_id").notNull().unique(),
    qrisString: text("qris_string").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const sessions = sqliteTable("sessions", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .$defaultFn(() => new Date()),
});

export const mailboxes = sqliteTable("mailboxes", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    address: text("address").notNull().unique(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" })
        .notNull()
        .$defaultFn(() => new Date()),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});

export const emails = sqliteTable("emails", {
    id: text("id").primaryKey(),
    mailboxId: text("mailbox_id")
        .notNull()
        .references(() => mailboxes.id, { onDelete: "cascade" }),
    fromAddress: text("from_address").notNull(),
    fromName: text("from_name").default(""),
    subject: text("subject").default("(No Subject)"),
    bodyText: text("body_text").default(""),
    bodyHtml: text("body_html").default(""),
    isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
    receivedAt: integer("received_at", { mode: "timestamp" })
        .notNull()
        .$defaultFn(() => new Date()),
});

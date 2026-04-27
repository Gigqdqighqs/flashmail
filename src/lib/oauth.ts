import { Google } from "arctic";

const getRedirectUrl = () => {
    let base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    if (!base.startsWith("http")) base = `https://${base}`;
    base = base.replace(/\/$/, "");
    return `${base}/api/auth/google/callback`;
};

export const google = new Google(
    process.env.GOOGLE_CLIENT_ID ?? "",
    process.env.GOOGLE_CLIENT_SECRET ?? "",
    getRedirectUrl()
);

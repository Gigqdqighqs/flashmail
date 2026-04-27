import PostalMime from "postal-mime";

/**
 * FlashMail Cloudflare Email Worker
 *
 * Receives incoming email via Cloudflare Email Routing,
 * parses it with postal-mime, and POSTs to the FlashMail API.
 */

// Your FlashMail API base URL
const API_BASE = "https://flashmail.qzz.io";

export default {
    async email(message, env, ctx) {
        try {
            // Read the raw email stream
            const rawEmail = await streamToArrayBuffer(message.raw, message.rawSize);

            // Parse the email with postal-mime
            const parser = new PostalMime();
            const parsed = await parser.parse(rawEmail);

            // Extract fields
            const from = message.from;
            const to = message.to;
            const fromName = parsed.from?.name || "";
            const subject = parsed.subject || "(No Subject)";
            const bodyText = parsed.text || "";
            const bodyHtml = parsed.html || "";

            console.log(`📬 Received email: ${from} → ${to} | Subject: ${subject}`);

            // POST to FlashMail API
            const response = await fetch(`${API_BASE}/api/inbound`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${env.INBOUND_SECRET}`,
                },
                body: JSON.stringify({
                    from,
                    to,
                    fromName,
                    subject,
                    bodyText,
                    bodyHtml,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                console.error(`❌ API error: ${response.status} - ${error}`);
            } else {
                console.log(`✅ Email saved successfully`);
            }
        } catch (error) {
            console.error(`❌ Worker error:`, error);
            // Don't throw - we don't want to bounce the email
        }
    },
};

/**
 * Convert a ReadableStream to ArrayBuffer
 */
async function streamToArrayBuffer(stream, streamSize) {
    let result = new Uint8Array(streamSize);
    let bytesRead = 0;
    const reader = stream.getReader();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result.set(value, bytesRead);
        bytesRead += value.byteLength;
    }

    return result;
}

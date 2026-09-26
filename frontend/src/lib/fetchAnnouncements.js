/**
 * Server-side fetch for marketing notifications (works without login).
 */
export async function fetchWebsiteAnnouncements(limit = 5) {
  const base = (
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:5000/api"
  ).replace("://localhost", "://127.0.0.1");

  const url = `${base}/customer-notifications/announcements?limit=${limit}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json();
    return data?.announcements || [];
  } catch (err) {
    console.warn("fetchWebsiteAnnouncements failed:", err?.message || err);
    return [];
  }
}

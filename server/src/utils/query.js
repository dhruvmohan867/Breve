const SORT_FIELDS = new Set(["createdAt", "views", "title"]);

export function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function clampPage(value) {
    const page = parseInt(value, 10);
    if (!Number.isFinite(page) || page < 1) return 1;
    return page;
}

export function clampLimit(value, fallback = 10, max = 50) {
    const limit = parseInt(value, 10);
    if (!Number.isFinite(limit) || limit < 1) return fallback;
    return Math.min(limit, max);
}

export function allowedSortField(value) {
    return SORT_FIELDS.has(value) ? value : "createdAt";
}

export function sortDirection(value) {
    return value === "asc" ? 1 : -1;
}

export function searchText(value) {
    return String(value || "")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 100);
}

export function lengthBounds(value) {
    if (!value) return null;
    if (value === "under15") return { $gte: 0, $lt: 15 };
    if (value === "mid") return { $gte: 15, $lte: 30 };
    if (value === "over30") return { $gt: 30 };
    return false;
}

export function matchedPhrase(doc, query) {
    const words = searchText(query).toLowerCase().split(" ").filter(Boolean);
    if (!words.length) return "";
    const fields = [doc.title, doc.description, doc.place, doc.maker];
    for (const field of fields) {
        const text = String(field || "");
        const lower = text.toLowerCase();
        const hit = words.find((word) => lower.includes(word));
        if (!hit) continue;
        const at = lower.indexOf(hit);
        const start = Math.max(0, at - 28);
        const end = Math.min(text.length, at + hit.length + 28);
        const slice = text.slice(start, end).trim();
        return `${start > 0 ? "..." : ""}${slice}${end < text.length ? "..." : ""}`;
    }
    return "";
}

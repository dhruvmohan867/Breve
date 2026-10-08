export function publicIdFromUrl(url) {
    if (!url || typeof url !== "string") return null;
    try {
        const pathname = new URL(url).pathname;
        const marker = "/upload/";
        const uploadAt = pathname.indexOf(marker);
        if (uploadAt === -1) return null;
        let rest = pathname.slice(uploadAt + marker.length);
        rest = rest.replace(/^v\d+\//, "");
        rest = rest.replace(/\.[a-zA-Z0-9]+$/, "");
        return rest || null;
    } catch {
        return null;
    }
}

export function resolvePublicId(storedId, url) {
    return storedId || publicIdFromUrl(url);
}

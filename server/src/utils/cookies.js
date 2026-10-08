// The site is often opened at 127.0.0.1 while the API is localhost.
// Those are different sites, so a Lax cookie is dropped on refresh.
// Both hosts are treated as secure, so SameSite=None and Secure stick on http.
const base = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
};

export const accessCookieOptions = {
    ...base,
    maxAge: 24 * 60 * 60 * 1000,
};

export const refreshCookieOptions = {
    ...base,
    maxAge: 10 * 24 * 60 * 60 * 1000,
};

export const clearCookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
};

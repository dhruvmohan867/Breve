import rateLimit from "express-rate-limit";

const message = {
    success: false,
    message: "Too many requests, please try again later",
    errors: [],
};

export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message,
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        ...message,
        message: "Too many attempts, please try again later",
    },
});

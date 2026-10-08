import "./config/env.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { apiLimiter } from "./middlewares/rateLimit.middleware.js";

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(apiLimiter);

const configuredOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(cors({
    origin(origin, callback) {
        if (!origin || origin === configuredOrigin) {
            callback(null, true);
            return;
        }
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            callback(null, true);
            return;
        }
        callback(null, false);
    },
    credentials: true,
}));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());

import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";
import commentRouter from "./routes/comment.routes.js";
import likeRouter from "./routes/like.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import tweetRouter from "./routes/tweet.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import healthcheckRouter from "./routes/healthcheck.routes.js";
import programRouter from "./routes/program.routes.js";

app.use("/api/v1/users", userRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/playlists", playlistRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/programs", programRouter);

app.use((err, req, res, next) => {
    if (err?.name === "MulterError") {
        const message = err.code === "LIMIT_FILE_SIZE"
            ? "File exceeds the 500 MB limit"
            : "Upload failed";
        return res.status(400).json({
            success: false,
            message,
            errors: [],
        });
    }

    if (err?.name === "ValidationError") {
        const message = Object.values(err.errors || {})
            .map((item) => item.message)
            .join(", ") || "Invalid data";
        return res.status(400).json({
            success: false,
            message,
            errors: [],
        });
    }

    if (err?.code === 11000) {
        return res.status(409).json({
            success: false,
            message: "That value is already in use",
            errors: [],
        });
    }

    const statusCode = err.statusCode || 500;
    if (statusCode >= 500) {
        console.error(err.message || "Internal Server Error");
    }

    return res.status(statusCode).json({
        success: false,
        message: err.message || "Internal Server Error",
        errors: err.errors || [],
    });
});

export { app };

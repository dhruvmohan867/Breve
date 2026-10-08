import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

const readAccessToken = (req) => {
    const authHeader = req.headers.authorization || "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "");
    return req.cookies?.accessToken || (authHeader ? bearer : null);
};

const userFromAccessToken = async (token) => {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    return User.findById(decoded?._id).select("-password -refreshtoken");
};

export const verifyJwt = asyncHandler(async (req, res, next) => {
    const token = readAccessToken(req);
    if (!token) {
        throw new ApiError(401, "Access token is required");
    }

    try {
        const user = await userFromAccessToken(token);
        if (!user) {
            throw new ApiError(401, "Invalid access token");
        }
        req.user = user;
        next();
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(401, "Invalid access token");
    }
});

export const optionalJwt = asyncHandler(async (req, res, next) => {
    const token = readAccessToken(req);
    if (!token) {
        return next();
    }

    try {
        const user = await userFromAccessToken(token);
        if (user) req.user = user;
    } catch {
        // A missing or expired session still allows a public read.
    }

    next();
});

import multer from "multer";
import os from "os";
import { ApiError } from "../utils/ApiError.js";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, os.tmpdir());
    },
    filename: function (req, file, cb) {
        const safeName = file.originalname.replace(/\s+/g, "_").replace(/^\.+/, "");
        cb(null, `${Date.now()}_${safeName}`);
    },
});

const fileFilter = (req, file, cb) => {
    if (file.fieldname === "captions") {
        const name = file.originalname.toLowerCase();
        if (name.endsWith(".vtt") || file.mimetype === "text/vtt") {
            cb(null, true);
            return;
        }
        cb(new ApiError(400, "Captions must be a .vtt file"), false);
        return;
    }

    const allowedImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const allowedVideoTypes = ["video/mp4", "video/mpeg", "video/webm", "video/quicktime", "video/x-msvideo"];
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new ApiError(400, `Unsupported file type: ${file.mimetype}. Only images and videos are allowed.`), false);
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 500 * 1024 * 1024,
    },
});

import "../config/env.js";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const removeLocalFile = (localFilePath) => {
    if (!localFilePath || !fs.existsSync(localFilePath)) return;
    try {
        fs.unlinkSync(localFilePath);
    } catch (error) {
        console.error("Could not remove temp upload");
    }
};

const uploadCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });
        removeLocalFile(localFilePath);
        return { ...response, url: response.secure_url || response.url };
    } catch (error) {
        console.error("Cloudinary upload failed");
        removeLocalFile(localFilePath);
        return null;
    }
};

const uploadOnCloudinary = uploadCloudinary;

const uploadRawCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "raw",
        });
        removeLocalFile(localFilePath);
        return { ...response, url: response.secure_url || response.url };
    } catch (error) {
        console.error("Cloudinary upload failed");
        removeLocalFile(localFilePath);
        return null;
    }
};

const uploadVideoCloudinary = (localFilePath) => new Promise((resolve) => {
    if (!localFilePath) {
        resolve(null);
        return;
    }
    let settled = false;
    const finish = (value) => {
        if (settled) return;
        settled = true;
        removeLocalFile(localFilePath);
        resolve(value);
    };
    try {
        const stream = cloudinary.uploader.upload_large(localFilePath, {
            resource_type: "video",
            chunk_size: 20 * 1024 * 1024,
        }, (error, uploaded) => {
            if (error || !uploaded?.secure_url && !uploaded?.url) {
                console.error("Cloudinary video upload failed");
                finish(null);
                return;
            }
            finish({ ...uploaded, url: uploaded.secure_url || uploaded.url });
        });
        if (stream && typeof stream.on === "function") {
            stream.on("error", () => finish(null));
        }
    } catch (error) {
        console.error("Cloudinary video upload failed");
        finish(null);
    }
});

const deleteFromCloudinary = async (publicId, resourceType = "image") => {
    try {
        if (!publicId) return null;
        return await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (error) {
        console.error("Cloudinary delete failed");
        return null;
    }
};

export {
    uploadCloudinary,
    uploadOnCloudinary,
    uploadRawCloudinary,
    uploadVideoCloudinary,
    deleteFromCloudinary,
};

import { Router } from "express";
import {
    getCatalogFacets,
    getAllVideos,
    publishAVideo,
    getVideoById,
    recordVideoView,
    updateVideo,
    deleteVideo,
    togglePublishStatus
} from "../controllers/video.controller.js";
import { verifyJwt, optionalJwt } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { body } from "express-validator";
import { validate } from "../middlewares/validate.middleware.js";

const router = Router();

// Public routes
router.route("/").get(getAllVideos);
router.route("/facets").get(getCatalogFacets);
router.route("/:videoId/view").post(optionalJwt, recordVideoView);
router.route("/:videoId").get(optionalJwt, getVideoById);

// Protected routes
router.route("/").post(
    verifyJwt,
    upload.fields([
        { name: "videoFile", maxCount: 1 },
        { name: "thumbnail", maxCount: 1 },
        { name: "captions", maxCount: 1 }
    ]),
    [
        body("title").notEmpty().withMessage("Title is required").isLength({ max: 100 }).withMessage("Title must not exceed 100 characters")
    ],
    validate,
    publishAVideo
);

router.route("/:videoId").patch(
    verifyJwt,
    upload.fields([
        { name: "thumbnail", maxCount: 1 },
        { name: "captions", maxCount: 1 }
    ]),
    updateVideo
);

router.route("/:videoId").delete(verifyJwt, deleteVideo);

router.route("/toggle/publish/:videoId").patch(verifyJwt, togglePublishStatus);

export default router;

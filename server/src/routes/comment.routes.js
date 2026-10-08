import { Router } from "express";
import {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
} from "../controllers/comment.controller.js";
import { verifyJwt, optionalJwt } from "../middlewares/auth.middleware.js";
import { body } from "express-validator";
import { validate } from "../middlewares/validate.middleware.js";

const router = Router();

// Public
router.route("/:videoId").get(optionalJwt, getVideoComments);

// Protected
router.route("/:videoId").post(
    verifyJwt,
    [
        body("content").notEmpty().withMessage("Comment content is required").isLength({ max: 280 }).withMessage("Comment must not exceed 280 characters")
    ],
    validate,
    addComment
);

router.route("/c/:commentId").patch(verifyJwt, updateComment);
router.route("/c/:commentId").delete(verifyJwt, deleteComment);

export default router;

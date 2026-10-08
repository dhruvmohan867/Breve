import { Router } from "express";
import {loginUser, logoutUser, registerUser , refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory} from "../controllers/user.controller.js"
import {upload} from "../middlewares/multer.middleware.js"  
import { verifyJwt, optionalJwt } from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/rateLimit.middleware.js";  
import { body, oneOf } from "express-validator";
import { validate } from "../middlewares/validate.middleware.js";

const router = Router()

router.route("/register").post(
    authLimiter,
    upload.fields([
        { name: 'avatar', maxCount: 1 },
        { name: 'coverImage', maxCount: 1 }
    ]),
    [
        body("fullname").notEmpty().withMessage("Full name is required"),
        body("email").isEmail().withMessage("Valid email is required"),
        body("username")
            .isAlphanumeric().withMessage("Username must be alphanumeric")
            .isLength({ min: 3, max: 20 }).withMessage("Username must be 3-20 characters"),
        body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
    ],
    validate,
    registerUser
)

router.route("/login").post(
    authLimiter,
    [
        oneOf([
            body("email").notEmpty().withMessage("Email is required"),
            body("username").notEmpty().withMessage("Username is required")
        ], { message: "Email or username is required" }),
        body("password").notEmpty().withMessage("Password is required")
    ],
    validate,
    loginUser
)

router.route("/logout").post(verifyJwt , logoutUser)
router.route("/refresh-token").post(authLimiter, refreshAccessToken)
router.route("/change-password").post(verifyJwt, authLimiter, changeCurrentPassword)
router.route("/current-user").get(verifyJwt , getCurrentUser)
router.route("/update-account").patch(verifyJwt, updateAccountDetails)
router.route("/avatar").patch(verifyJwt, upload.single('avatar'), updateUserAvatar)
router.route("/cover-image").patch(verifyJwt, upload.single('coverImage'), updateUserCoverImage)
router.route("/c/:username").get(optionalJwt, getUserChannelProfile) 
router.route("/history").get(verifyJwt , getWatchHistory)
export default router
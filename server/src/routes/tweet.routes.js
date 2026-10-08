import { Router } from "express";
import {
    createTweet,
    getAllTweets,
    getUserTweets,
    updateTweet,
    deleteTweet
} from "../controllers/tweet.controller.js";
import { verifyJwt, optionalJwt } from "../middlewares/auth.middleware.js";
import { body } from "express-validator";
import { validate } from "../middlewares/validate.middleware.js";

const router = Router();

// Public
router.route("/").get(optionalJwt, getAllTweets);
router.route("/user/:userId").get(optionalJwt, getUserTweets);

// Protected
router.route("/").post(
    verifyJwt,
    [
        body("content").notEmpty().withMessage("Tweet content is required").isLength({ max: 280 }).withMessage("Tweet must not exceed 280 characters")
    ],
    validate,
    createTweet
);

router.route("/:tweetId").patch(verifyJwt, updateTweet);
router.route("/:tweetId").delete(verifyJwt, deleteTweet);

export default router;

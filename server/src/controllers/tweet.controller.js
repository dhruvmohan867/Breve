import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {Like} from "../models/like.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {clampPage, clampLimit} from "../utils/query.js"

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body

    if (!content?.trim()) {
        throw new ApiError(400, "Tweet content is required")
    }

    if (content.trim().length > 280) {
        throw new ApiError(400, "Tweet content must not exceed 280 characters")
    }

    const tweet = await Tweet.create({
        content: content.trim(),
        owner: req.user._id
    })

    const createdTweet = await Tweet.findById(tweet._id).populate("owner", "fullname username avatar")

    return res.status(201).json(
        new ApiResponse(201, createdTweet, "Tweet created successfully")
    )
})

const listTweets = async (match, page, limit, req) => {
    const pageNum = clampPage(page)
    const limitNum = clampLimit(limit)
    const skip = (pageNum - 1) * limitNum
    const likedBy = req.user?._id || null
    const totalDocs = await Tweet.countDocuments(match)
    const totalPages = Math.ceil(totalDocs / limitNum) || 0

    const tweets = await Tweet.aggregate([
        { $match: match },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limitNum },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    { $project: { fullname: 1, username: 1, avatar: 1 } }
                ]
            }
        },
        { $addFields: { owner: { $first: "$owner" } } },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likes"
            }
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                isLiked: {
                    $cond: {
                        if: likedBy ? { $in: [likedBy, "$likes.likedBy"] } : false,
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                content: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1,
                createdAt: 1,
                updatedAt: 1
            }
        }
    ])

    return { docs: tweets, totalDocs, page: pageNum, totalPages, hasNextPage: pageNum < totalPages, hasPrevPage: pageNum > 1 }
}

const getAllTweets = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query
    const result = await listTweets({}, page, limit, req)
    return res.status(200).json(new ApiResponse(200, result, "Tweets fetched successfully"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params
    const { page = 1, limit = 10 } = req.query

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID")
    }

    const result = await listTweets(
        { owner: new mongoose.Types.ObjectId(String(userId)) },
        page,
        limit,
        req
    )

    return res.status(200).json(
        new ApiResponse(200, result, "User tweets fetched successfully")
    )
})

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    const { content } = req.body

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID")
    }

    if (!content?.trim()) {
        throw new ApiError(400, "Tweet content is required")
    }

    if (content.trim().length > 280) {
        throw new ApiError(400, "Tweet content must not exceed 280 characters")
    }

    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    // Only owner can update
    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this tweet")
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        { $set: { content: content.trim() } },
        { new: true }
    ).populate("owner", "fullname username avatar")

    return res.status(200).json(
        new ApiResponse(200, updatedTweet, "Tweet updated successfully")
    )
})

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID")
    }

    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    // Only owner can delete
    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this tweet")
    }

    // Delete associated likes
    await Like.deleteMany({ tweet: tweetId })

    await Tweet.findByIdAndDelete(tweetId)

    return res.status(200).json(
        new ApiResponse(200, null, "Tweet deleted successfully")
    )
})

export {
    createTweet,
    getAllTweets,
    getUserTweets,
    updateTweet,
    deleteTweet
}
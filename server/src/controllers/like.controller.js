import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: req.user._id
    })

    let liked = false

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id)
    } else {
        try {
            await Like.create({
                video: videoId,
                likedBy: req.user._id
            })
            liked = true
        } catch (error) {
            if (error?.code !== 11000) throw error
            liked = true
        }
    }

    const likesCount = await Like.countDocuments({ video: videoId })

    return res.status(200).json(
        new ApiResponse(200, { liked, likesCount }, liked ? "Video liked" : "Video unliked")
    )
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }

    const existingLike = await Like.findOne({
        comment: commentId,
        likedBy: req.user._id
    })

    let liked = false

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id)
    } else {
        try {
            await Like.create({
                comment: commentId,
                likedBy: req.user._id
            })
            liked = true
        } catch (error) {
            if (error?.code !== 11000) throw error
            liked = true
        }
    }

    const likesCount = await Like.countDocuments({ comment: commentId })

    return res.status(200).json(
        new ApiResponse(200, { liked, likesCount }, liked ? "Comment liked" : "Comment unliked")
    )
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID")
    }

    const existingLike = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user._id
    })

    let liked = false

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id)
    } else {
        try {
            await Like.create({
                tweet: tweetId,
                likedBy: req.user._id
            })
            liked = true
        } catch (error) {
            if (error?.code !== 11000) throw error
            liked = true
        }
    }

    const likesCount = await Like.countDocuments({ tweet: tweetId })

    return res.status(200).json(
        new ApiResponse(200, { liked, likesCount }, liked ? "Tweet liked" : "Tweet unliked")
    )
})

const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(String(req.user._id)),
                video: { $exists: true, $ne: null }
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: { $first: "$owner" }
                        }
                    },
                    {
                        $project: {
                            title: 1,
                            thumbnail: 1,
                            duration: 1,
                            views: 1,
                            owner: 1,
                            createdAt: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                video: { $first: "$video" }
            }
        },
        {
            $match: {
                video: { $ne: null }
            }
        },
        {
            $replaceRoot: { newRoot: "$video" }
        },
        {
            $sort: { createdAt: -1 }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200, likedVideos, "Liked videos fetched successfully")
    )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}
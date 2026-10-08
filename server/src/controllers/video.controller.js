import crypto from "crypto"
import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {Like} from "../models/like.model.js"
import {Comment} from "../models/comment.model.js"
import {Playlist} from "../models/playlist.model.js"
import {Program} from "../models/program.model.js"
import {Subscription} from "../models/subscription.model.js"
import {ViewMark} from "../models/viewmark.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary, uploadVideoCloudinary, uploadRawCloudinary, deleteFromCloudinary} from "../utils/cloudinary.js"
import {resolvePublicId} from "../utils/mediaId.js"
import {escapeRegex, clampPage, clampLimit, allowedSortField, sortDirection, searchText, lengthBounds, matchedPhrase} from "../utils/query.js"
import {probeVideo, extractPoster} from "../utils/probe.js"
import {viewThreshold} from "../utils/viewRule.js"
import path from "path"
import os from "os"
import fs from "fs"

const ownerIdOf = (owner) => (owner?._id || owner)?.toString()

const viewerKeyFor = (req) => {
    if (req.user?._id) return `user:${req.user._id.toString()}`
    const ip = req.ip || "unknown"
    const agent = req.get("user-agent") || ""
    const digest = crypto.createHash("sha256").update(`${ip}|${agent}`).digest("hex").slice(0, 32)
    return `anon:${digest}`
}

const clipCredit = (value, max, label) => {
    const trimmed = String(value ?? "").trim()
    if (trimmed.length > max) {
        throw new ApiError(400, `${label} must not exceed ${max} characters`)
    }
    return trimmed
}

const readCredits = (body) => {
    const fields = {}
    if (body.maker !== undefined) fields.maker = clipCredit(body.maker, 80, "Maker")
    if (body.place !== undefined) fields.place = clipCredit(body.place, 80, "Place")
    if (body.rights !== undefined) fields.rights = clipCredit(body.rights, 160, "Rights")
    if (body.year !== undefined && String(body.year).trim() !== "") {
        const year = Number(body.year)
        if (!Number.isInteger(year) || year < 1888 || year > 2100) {
            throw new ApiError(400, "Year must be between 1888 and 2100")
        }
        fields.year = year
    } else if (body.year !== undefined) {
        fields.year = null
    }
    return fields
}

const assertReadableVideo = (video, user) => {
    if (video.isPublish) return
    if (user && ownerIdOf(video.owner) === user._id.toString()) return
    throw new ApiError(404, "Video not found")
}


const getCatalogFacets = asyncHandler(async (req, res) => {
    const published = { isPublish: true }
    const [places, years] = await Promise.all([
        Video.distinct("place", { ...published, place: { $nin: [null, ""] } }),
        Video.distinct("year", { ...published, year: { $ne: null } })
    ])
    places.sort((a, b) => String(a).localeCompare(String(b)))
    years.sort((a, b) => a - b)
    return res.status(200).json(new ApiResponse(200, {
        places,
        years,
        lengths: [
            { id: "under15", label: "Under 15 seconds" },
            { id: "mid", label: "15 to 30 seconds" },
            { id: "over30", label: "Over 30 seconds" }
        ]
    }, "Catalog facets fetched"))
})

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId, place, year, week } = req.query

    const pipeline = []

    const matchConditions = { isPublish: true }
    const words = searchText(query)

    if (words) {
        matchConditions.$text = { $search: words }
    }

    const bounds = lengthBounds(req.query.length)
    if (bounds === false) {
        throw new ApiError(400, "Unknown length")
    }
    if (bounds) matchConditions.duration = bounds

    if (place && String(place).trim()) {
        const name = String(place).trim().slice(0, 80)
        matchConditions.place = { $regex: `^${escapeRegex(name)}$`, $options: "i" }
    }

    if (year !== undefined && String(year).trim() !== "") {
        const filmed = Number(year)
        if (!Number.isInteger(filmed) || filmed < 1888 || filmed > 2100) {
            throw new ApiError(400, "Unknown year")
        }
        matchConditions.year = filmed
    }

    let weekOrder = null
    if (week !== undefined && String(week).trim() !== "") {
        if (week !== "current") throw new ApiError(400, "Unknown week")
        const program = await Program.findOne({ status: "published" }).select("slots")
        weekOrder = new Map((program?.slots || []).map((slot) => [slot.video.toString(), slot.position]))
        matchConditions._id = { $in: (program?.slots || []).map((slot) => slot.video) }
    }

    // Filter by userId (owner)
    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid userId")
        }
        matchConditions.owner = new mongoose.Types.ObjectId(String(userId))
    }

    pipeline.push({ $match: matchConditions })

    pipeline.push({ $sort: { [allowedSortField(sortBy)]: sortDirection(sortType) } })

    // Lookup owner details
    pipeline.push(
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
        }
    )

    // Use aggregatePaginate for pagination
    const aggregate = Video.aggregate(pipeline)
    const options = {
        page: clampPage(page),
        limit: clampLimit(limit)
    }

    const result = await Video.aggregatePaginate(aggregate, options)
    const docs = result.docs.map((doc) => ({
        ...doc,
        match: words ? matchedPhrase(doc, words) : ""
    }))
    if (weekOrder) {
        docs.sort((a, b) => (weekOrder.get(String(a._id)) || 0) - (weekOrder.get(String(b._id)) || 0))
    }

    return res.status(200).json(
        new ApiResponse(200, {
            docs,
            totalDocs: result.totalDocs,
            page: result.page,
            totalPages: result.totalPages,
            hasNextPage: result.hasNextPage,
            hasPrevPage: result.hasPrevPage
        }, "Videos fetched successfully")
    )
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    const credits = readCredits(req.body)

    if (!title?.trim()) {
        throw new ApiError(400, "Title is required")
    }

    // Validate files exist
    const videoFileLocalPath = req.files?.videoFile?.[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path
    const captionsLocalPath = req.files?.captions?.[0]?.path

    if (!videoFileLocalPath) {
        throw new ApiError(400, "Video file is required")
    }

    const facts = await probeVideo(videoFileLocalPath)
    if (!facts) {
        fs.unlink(videoFileLocalPath, () => {})
        if (thumbnailLocalPath) fs.unlink(thumbnailLocalPath, () => {})
        if (captionsLocalPath) fs.unlink(captionsLocalPath, () => {})
        throw new ApiError(400, "This file could not be read as a film")
    }

    let posterLocalPath = ""
    if (!thumbnailLocalPath) {
        const requested = String(req.body.posterSecond ?? "").trim()
        const at = requested === "" ? Math.min(1, facts.duration / 2) : Number(requested)
        if (!Number.isFinite(at) || at < 0 || at > facts.duration) {
            throw new ApiError(400, "Poster time is outside the film")
        }
        posterLocalPath = path.join(os.tmpdir(), `breve-poster-${Date.now()}.jpg`)
        try {
            await extractPoster(videoFileLocalPath, at, posterLocalPath)
        } catch {
            throw new ApiError(400, "Could not take a poster from that moment")
        }
    }

    const videoFile = await uploadVideoCloudinary(videoFileLocalPath)
    if (!videoFile) {
        if (posterLocalPath) fs.unlink(posterLocalPath, () => {})
        throw new ApiError(500, "Failed to upload video file to Cloudinary")
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath || posterLocalPath)
    if (!thumbnail) {
        throw new ApiError(500, "Failed to upload thumbnail to Cloudinary")
    }

    let captions = null
    if (captionsLocalPath) {
        captions = await uploadRawCloudinary(captionsLocalPath)
        if (!captions) {
            throw new ApiError(500, "Failed to upload captions")
        }
    }

    const video = await Video.create({
        videofile: videoFile.url,
        thumbnail: thumbnail.url,
        title: title.trim(),
        description: description?.trim() || "",
        maker: credits.maker || "",
        place: credits.place || "",
        year: credits.year ?? null,
        rights: credits.rights || "",
        duration: facts.duration,
        width: facts.width,
        height: facts.height,
        codec: facts.codec,
        captions: captions?.url || "",
        captionsPublicId: captions?.public_id || "",
        videoPublicId: videoFile.public_id,
        thumbnailPublicId: thumbnail.public_id,
        owner: req.user._id,
        isPublish: true,
        views: 0
    })

    const createdVideo = await Video.findById(video._id).populate("owner", "fullname username avatar")

    return res.status(201).json(
        new ApiResponse(201, createdVideo, "Video published successfully")
    )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const video = await Video.findById(videoId).populate("owner", "fullname username avatar")

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    assertReadableVideo(video, req.user)

    const likesCount = await Like.countDocuments({ video: video._id })
    let isLiked = false
    let isSubscribed = false

    if (req.user) {
        isLiked = Boolean(await Like.exists({ video: video._id, likedBy: req.user._id }))
        const channelId = video.owner?._id || video.owner
        if (channelId) {
            isSubscribed = Boolean(await Subscription.exists({
                subscriber: req.user._id,
                channel: channelId
            }))
        }
    }

    const program = await Program.findOne({ status: "published" }).select("slots")
    const orderedIds = (program?.slots || [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((slot) => slot.video?.toString())
        .filter(Boolean)
    const here = orderedIds.indexOf(video._id.toString())
    let nextInWeek = null
    if (here >= 0 && here < orderedIds.length - 1) {
        nextInWeek = await Video.findOne({ _id: orderedIds[here + 1], isPublish: true })
            .select("title thumbnail duration")
    }

    const kinOr = []
    if (video.place) kinOr.push({ place: video.place })
    if (video.year) kinOr.push({ year: video.year })
    const skipIds = [video._id]
    if (nextInWeek) skipIds.push(nextInWeek._id)
    const kin = kinOr.length
        ? await Video.find({ isPublish: true, _id: { $nin: skipIds }, $or: kinOr })
            .select("title thumbnail duration place year")
            .limit(4)
        : []

    return res.status(200).json(
        new ApiResponse(200, {
            ...video.toObject(),
            likesCount,
            isLiked,
            isSubscribed,
            nextInWeek,
            kin
        }, "Video fetched successfully")
    )
})

const recordVideoView = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    assertReadableVideo(video, req.user)

    let counted = false
    const watched = Number(req.body?.watchedSeconds)
    const needed = viewThreshold(video.duration)
    if (Number.isFinite(watched) && watched + 0.05 >= needed) {
        try {
            await ViewMark.create({ video: video._id, viewerKey: viewerKeyFor(req) })
            counted = true
        } catch (error) {
            if (error?.code !== 11000) throw error
        }
    }

    if (counted) {
        video.views = (video.views || 0) + 1
        await video.save({ validateBeforeSave: false })
    }

    if (req.user) {
        await User.findByIdAndUpdate(req.user._id, { $addToSet: { watchHistory: video._id } })
    }

    return res.status(200).json(
        new ApiResponse(200, { views: video.views, counted }, "View recorded")
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { title, description } = req.body
    const credits = readCredits(req.body)

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    // Only owner can update
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this video")
    }

    const updateFields = {}
    if (title?.trim()) updateFields.title = title.trim()
    if (typeof description === "string") updateFields.description = description.trim()
    Object.assign(updateFields, credits)

    const thumbnailFile = req.files?.thumbnail?.[0] || req.file
    if (thumbnailFile) {
        const oldPublicId = resolvePublicId(video.thumbnailPublicId, video.thumbnail)
        await deleteFromCloudinary(oldPublicId)

        const thumbnail = await uploadOnCloudinary(thumbnailFile.path)
        if (!thumbnail) {
            throw new ApiError(500, "Failed to upload new thumbnail")
        }
        updateFields.thumbnail = thumbnail.url
        updateFields.thumbnailPublicId = thumbnail.public_id
    }

    const captionsFile = req.files?.captions?.[0]
    if (captionsFile) {
        if (video.captionsPublicId) {
            await deleteFromCloudinary(video.captionsPublicId, "raw")
        }
        const captions = await uploadRawCloudinary(captionsFile.path)
        if (!captions) {
            throw new ApiError(500, "Failed to upload captions")
        }
        updateFields.captions = captions.url
        updateFields.captionsPublicId = captions.public_id
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { $set: updateFields },
        { new: true }
    ).populate("owner", "fullname username avatar")

    return res.status(200).json(
        new ApiResponse(200, updatedVideo, "Video updated successfully")
    )
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this video")
    }

    const removeVideoRecords = async (session) => {
        const options = session ? { session } : {}
        await Like.deleteMany({ video: videoId }, options)
        await Comment.deleteMany({ video: videoId }, options)
        await ViewMark.deleteMany({ video: videoId }, options)
        await Playlist.updateMany({ videos: videoId }, { $pull: { videos: videoId } }, options)
        await Program.updateMany({ "slots.video": videoId }, { $pull: { slots: { video: videoId } } }, options)
        await User.updateMany({ watchHistory: videoId }, { $pull: { watchHistory: videoId } }, options)
        await Video.findByIdAndDelete(videoId, options)
    }

    let removedInTransaction = false
    const session = await mongoose.startSession()
    try {
        await session.withTransaction(async () => {
            await removeVideoRecords(session)
        })
        removedInTransaction = true
    } catch (error) {
        const message = String(error?.message || "")
        const standalone = message.includes("replica set") || message.includes("Transaction numbers")
        if (!standalone) throw error
    } finally {
        await session.endSession()
    }

    if (!removedInTransaction) {
        await removeVideoRecords(null)
    }

    await deleteFromCloudinary(resolvePublicId(video.videoPublicId, video.videofile), "video")
    await deleteFromCloudinary(resolvePublicId(video.thumbnailPublicId, video.thumbnail))
    if (video.captionsPublicId) {
        await deleteFromCloudinary(video.captionsPublicId, "raw")
    }

    return res.status(200).json(
        new ApiResponse(200, null, "Video deleted successfully")
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    // Only owner can toggle publish status
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to toggle publish status")
    }

    video.isPublish = !video.isPublish
    await video.save({ validateBeforeSave: false })

    return res.status(200).json(
        new ApiResponse(200, video, `Video ${video.isPublish ? "published" : "unpublished"} successfully`)
    )
})

export {
    getCatalogFacets,
    getAllVideos,
    publishAVideo,
    getVideoById,
    recordVideoView,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
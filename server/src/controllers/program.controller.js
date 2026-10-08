import mongoose, { isValidObjectId } from "mongoose"
import { Program } from "../models/program.model.js"
import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const MAX_FILMS = 8

const presentProgram = (program) => {
    const films = (program.slots || [])
        .filter((slot) => slot.video && slot.video.isPublish)
        .sort((a, b) => a.position - b.position)
        .map((slot, index) => ({
            ...slot.video.toObject(),
            position: index + 1
        }))

    const totalRuntime = films.reduce((sum, film) => sum + (Number(film.duration) || 0), 0)

    return {
        _id: program._id,
        title: program.title,
        note: program.note,
        status: program.status,
        owner: program.owner,
        totalRuntime,
        filmCount: films.length,
        films,
        createdAt: program.createdAt,
        updatedAt: program.updatedAt
    }
}

const loadPublished = () => Program.findOne({ status: "published" })
    .populate({
        path: "slots.video",
        populate: { path: "owner", select: "fullname username avatar" }
    })
    .populate("owner", "fullname username")

const readBill = (body) => {
    const title = String(body.title || "").trim()
    const note = String(body.note || "").trim()
    if (!title) throw new ApiError(400, "A program needs a title")
    if (title.length > 80) throw new ApiError(400, "Title must not exceed 80 characters")
    if (note.length > 280) throw new ApiError(400, "Note must not exceed 280 characters")

    const rawIds = Array.isArray(body.videoIds) ? body.videoIds : null
    if (!rawIds || rawIds.length === 0) throw new ApiError(400, "Choose at least one film")
    if (rawIds.length > MAX_FILMS) throw new ApiError(400, `A program holds at most ${MAX_FILMS} films`)

    const seen = new Set()
    const videoIds = []
    for (const id of rawIds) {
        const value = String(id)
        if (!isValidObjectId(value)) throw new ApiError(400, "Invalid film id")
        if (seen.has(value)) throw new ApiError(400, "A film can appear only once")
        seen.add(value)
        videoIds.push(value)
    }
    return { title, note, videoIds }
}

const getCurrentProgram = asyncHandler(async (req, res) => {
    const program = await loadPublished()
    return res.status(200).json(
        new ApiResponse(200, program ? presentProgram(program) : null, "Program fetched")
    )
})

const publishProgram = asyncHandler(async (req, res) => {
    const { title, note, videoIds } = readBill(req.body)

    const videos = await Video.find({
        _id: { $in: videoIds.map((id) => new mongoose.Types.ObjectId(id)) },
        isPublish: true
    }).select("_id")

    if (videos.length !== videoIds.length) {
        throw new ApiError(400, "Every film on the bill must be published")
    }

    const slots = videoIds.map((id, index) => ({
        video: id,
        position: index + 1
    }))

    const existing = await Program.findOne({ status: "published" })
    if (existing && existing.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "This week's program belongs to someone else")
    }

    let program
    if (existing) {
        existing.title = title
        existing.note = note
        existing.slots = slots
        existing.status = "published"
        await existing.save()
        program = existing
    } else {
        program = await Program.create({
            title,
            note,
            slots,
            status: "published",
            owner: req.user._id
        })
    }

    const fresh = await loadPublished()
    return res.status(existing ? 200 : 201).json(
        new ApiResponse(existing ? 200 : 201, presentProgram(fresh || program), "Program published")
    )
})

export { getCurrentProgram, publishProgram }

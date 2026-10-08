import { execFile } from "child_process"
import { promisify } from "util"
import ffmpegPath from "ffmpeg-static"
import ffprobeStatic from "ffprobe-static"

const execFileAsync = promisify(execFile)

const probeVideo = async (filePath) => {
    let stdout
    try {
        const result = await execFileAsync(ffprobeStatic.path, [
            "-v", "error",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            filePath
        ])
        stdout = result.stdout
    } catch {
        return null
    }

    let data
    try {
        data = JSON.parse(stdout)
    } catch {
        return null
    }

    const stream = (data.streams || []).find((item) => item.codec_type === "video")
    const duration = Number(data.format?.duration || stream?.duration)
    if (!stream || !Number.isFinite(duration) || duration <= 0) return null

    return {
        duration,
        width: Number(stream.width) || null,
        height: Number(stream.height) || null,
        codec: stream.codec_name || ""
    }
}

const extractPoster = async (filePath, second, destPath) => {
    await execFileAsync(ffmpegPath, [
        "-y",
        "-ss", String(second),
        "-i", filePath,
        "-frames:v", "1",
        "-q:v", "2",
        destPath
    ])
}

export { probeVideo, extractPoster }

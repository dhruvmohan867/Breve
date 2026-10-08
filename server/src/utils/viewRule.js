const viewThreshold = (duration) => {
    const seconds = Number(duration)
    if (!Number.isFinite(seconds) || seconds <= 0) return 30
    return Math.min(30, seconds * 0.25)
}

export { viewThreshold }

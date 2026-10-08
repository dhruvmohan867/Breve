import mongoose, { Schema } from "mongoose";

const viewMarkSchema = new Schema({
    video: {
        type: Schema.Types.ObjectId,
        ref: "Video",
        required: true,
    },
    viewerKey: {
        type: String,
        required: true,
    },
}, { timestamps: true });

viewMarkSchema.index({ video: 1, viewerKey: 1 }, { unique: true });

export const ViewMark = mongoose.model("ViewMark", viewMarkSchema);

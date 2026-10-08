import mongoose, { Schema } from "mongoose";

const programSchema = new Schema({
    title: { type: String, required: true, maxlength: 80 },
    note: { type: String, default: "", maxlength: 280 },
    status: { type: String, enum: ["draft", "published"], default: "published" },
    slots: [{
        video: { type: Schema.Types.ObjectId, ref: "Video", required: true },
        position: { type: Number, required: true }
    }],
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

programSchema.index({ status: 1 });

export const Program = mongoose.model("Program", programSchema);

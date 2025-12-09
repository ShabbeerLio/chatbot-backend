import mongoose from "mongoose";

const callSchema = new mongoose.Schema(
  {
    caller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["audio", "video"], default: "audio" },
    status: {
      type: String,
      enum: ["ringing", "accepted", "rejected", "missed", "ended"],
      default: "ringing",
    },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    durationSec: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Call", callSchema);
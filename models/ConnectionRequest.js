import mongoose from "mongoose";

const connectionRequestSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    enum: ["Pending", "Accepted", "Rejected", "Blocked"],
    default: "Pending",
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("ConnectionRequest", connectionRequestSchema);

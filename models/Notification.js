import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // who receives notification
  type: {
    type: String,
    enum: [
      "connection_request",
      "connection_accept",
      "message",
      "wishlist_add",
      "profile_picture_request",
      "profile_picture_approved",
      "profile_picture_rejected",
    ],
  },
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  message: String,
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: "ConnectionRequest" },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Notification", notificationSchema);

import mongoose from "mongoose";

const subscriptionHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan" },
  couponCode: String,
  amount: Number,
  orderId: String,
  paymentStatus: {
    type: String,
    enum: ["PENDING", "SUCCESS", "FAILED"],
    default: "PENDING",
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("SubscriptionHistory", subscriptionHistorySchema);

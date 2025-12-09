import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, required: true },
    discount: Number,
    type: { type: String, enum: ["subscription", "product"], required: true },
    expiry: Date,
    status: { type: String, enum: ["enable", "disable"], default: "enable" },
  },
  { timestamps: true }
);

export default mongoose.model("Coupon", couponSchema);

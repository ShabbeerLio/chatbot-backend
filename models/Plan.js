import mongoose from "mongoose";

const planSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  slprice: Number,
  duration: Number,   // days
  status: { type: String, enum: ["active", "inactive"], default: "active" }
}, { timestamps: true });

export default mongoose.model("Plan", planSchema);
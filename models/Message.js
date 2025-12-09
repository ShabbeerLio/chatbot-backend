import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  content: String,
  isSeen: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const chatSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  updatedAt: { type: Date, default: Date.now },
});

export const Chat = mongoose.model("Chat", chatSchema);
export const Message = mongoose.model("Message", messageSchema);
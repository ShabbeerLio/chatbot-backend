import express from "express";
import { fetchUser } from "../middleware/fetchUser.js";
import { Chat, Message } from "../models/Message.js";

const router = express.Router();

// Create or get chat between two users
router.post("/create/:partnerId", fetchUser, async (req, res) => {
  let chat = await Chat.findOne({
    participants: { $all: [req.user.id, req.params.partnerId] },
  });

  if (!chat) {
    chat = new Chat({ participants: [req.user.id, req.params.partnerId] });
    await chat.save();
  }

  res.json(chat);
});

// ✅ Mark all messages as seen in a chat
router.put("/seen/:chatId", fetchUser, async (req, res) => {
  try {
    await Message.updateMany(
      {
        chatId: req.params.chatId,
        sender: { $ne: req.user.id },
        isSeen: false,
      },
      { $set: { isSeen: true } }
    );

    // Update chat's lastMessage.isSeen if last message belongs to partner
    const chat = await Chat.findById(req.params.chatId).populate("lastMessage");
    if (chat?.lastMessage?.sender.toString() !== req.user.id) {
      chat.lastMessage.isSeen = true;
      await chat.lastMessage.save();
    }

    res.json({ msg: "Messages marked as seen" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send message
router.post("/message/:chatId", fetchUser, async (req, res) => {
  const { content } = req.body;
  const message = new Message({
    chatId: req.params.chatId,
    sender: req.user.id,
    content,
  });

  await message.save();
  await Chat.findByIdAndUpdate(req.params.chatId, {
    lastMessage: message._id,
    updatedAt: Date.now(),
  });

  res.json(message);
});

// Fetch messages
router.get("/messages/:chatId", fetchUser, async (req, res) => {
  const messages = await Message.find({ chatId: req.params.chatId })
    .populate("sender", "name profilePic")
    .sort({ createdAt: 1 });
  res.json(messages);
});

// 🗑️ Delete Particular Chat Message (only within 5 mins)
router.delete("/message/delete/:messageId", fetchUser, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.messageId);
    if (!msg) return res.status(404).json({ msg: "Message not found" });
    if (msg.sender.toString() !== req.user.id)
      return res.status(403).json({ msg: "Not authorized" });

    const now = new Date();
    const created = new Date(msg.createdAt);
    const diff = (now - created) / 1000 / 60; // minutes

    if (diff > 5)
      return res.status(403).json({ msg: "Cannot delete after 5 minutes" });

    await msg.deleteOne();
    res.json({ msg: "Message deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✏️ Update Chat Message (only within 5 mins)
router.put("/message/update/:messageId", fetchUser, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.messageId);
    if (!msg) return res.status(404).json({ msg: "Message not found" });
    if (msg.sender.toString() !== req.user.id)
      return res.status(403).json({ msg: "Not authorized" });

    const now = new Date();
    const created = new Date(msg.createdAt);
    const diff = (now - created) / 1000 / 60; // minutes

    if (diff > 5)
      return res.status(403).json({ msg: "Cannot edit after 5 minutes" });

    msg.content = req.body.content || msg.content;
    await msg.save();
    res.json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 🧹 Delete All Chat Messages With Particular User
 */
router.delete("/deleteAll/:partnerId", fetchUser, async (req, res) => {
  try {
    const chat = await Chat.findOne({
      participants: { $all: [req.user.id, req.params.partnerId] },
    });
    if (!chat) return res.status(404).json({ msg: "Chat not found" });

    await Message.deleteMany({ chatId: chat._id });
    await chat.deleteOne();

    res.json({ msg: "All chat messages deleted for this user" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

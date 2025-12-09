import express from "express";
import { fetchUser } from "../middleware/fetchUser.js";
import ConnectionRequest from "../models/ConnectionRequest.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { Chat } from "../models/Message.js";
import { sendNotification } from "../app.js";

const router = express.Router();

// Send Connection Request
router.post("/send/:receiverId", fetchUser, async (req, res) => {
  try {
    const { receiverId } = req.params;

    const existing = await ConnectionRequest.findOne({
      sender: req.user.id,
      receiver: receiverId,
    });
    if (existing) return res.status(400).json({ msg: "Request already sent" });

    const newReq = new ConnectionRequest({
      sender: req.user.id,
      receiver: receiverId,
    });
    await newReq.save();

    const newNotif = await Notification.create({
      user: receiverId,
      type: "connection_request",
      fromUser: req.user.id,
      message: "wants to connect",
      requestId: newReq._id,
    });

    // ✅ Send via socket (real-time)
    sendNotification(receiverId, newNotif);

    res.json({ msg: "Request sent successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accept Connection Request
router.post("/accept/:requestId", fetchUser, async (req, res) => {
  try {
    const reqDoc = await ConnectionRequest.findById(req.params.requestId);
    if (!reqDoc) return res.status(404).json({ msg: "Request not found" });

    reqDoc.status = "Accepted";
    await reqDoc.save();

    await User.findByIdAndUpdate(reqDoc.sender, {
      $addToSet: { matches: reqDoc.receiver },
    });
    await User.findByIdAndUpdate(reqDoc.receiver, {
      $addToSet: { matches: reqDoc.sender },
    });

    // ❌ Delete pending notification
    await Notification.deleteOne({ requestId: req.params.requestId });

    const newNotif = await Notification.create({
      user: reqDoc.sender,
      type: "connection_accept",
      fromUser: reqDoc.receiver,
      message: "connection request accepted",
    });

    sendNotification(reqDoc.sender, newNotif);

    res.json({ msg: "Connection request accepted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 📨 Get All Connection Requests (Received)
 */
router.get("/requests", fetchUser, async (req, res) => {
  try {
    const requests = await ConnectionRequest.find({
      receiver: req.user.id,
      status: "Pending",
    }).populate("sender", "name city dob profilePic profession");
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 🔗 Get All Connected Users (Mutual Connections)
 */
router.get("/all", fetchUser, async (req, res) => {
  try {
    const connections = await ConnectionRequest.find({
      $or: [{ sender: req.user.id }, { receiver: req.user.id }],
      status: "Accepted",
    })
      .populate("sender", "name profilePic dob")
      .populate("receiver", "name profilePic dob");

    const connectedUsers = await Promise.all(
      connections.map(async (conn) => {
        const partner =
          conn.sender._id.toString() === req.user.id
            ? conn.receiver
            : conn.sender;

        // find or create chat between both users
        let chat = await Chat.findOne({
          participants: { $all: [req.user.id, partner._id] },
        }).populate("lastMessage");

        if (!chat) return partner; // no chat yet

        return {
          ...partner.toObject(),
          lastMessage: chat.lastMessage
            ? {
                content: chat.lastMessage.content,
                createdAt: chat.lastMessage.createdAt,
                isSeen: chat.lastMessage.isSeen,
                sentByMe: chat.lastMessage.sender.toString() === req.user.id,
              }
            : null,
        };
      })
    );

    // Sort by latest updated chat (descending)
    const sorted = connectedUsers.sort((a, b) => {
      const dateA = a.lastMessage?.createdAt
        ? new Date(a.lastMessage.createdAt)
        : 0;
      const dateB = b.lastMessage?.createdAt
        ? new Date(b.lastMessage.createdAt)
        : 0;
      return dateB - dateA;
    });

    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * ❌ Reject Connection Request
 */
router.post("/reject/:id", fetchUser, async (req, res) => {
  try {
    const reqDoc = await ConnectionRequest.findById(req.params.id);
    if (!reqDoc || reqDoc.receiver.toString() !== req.user.id)
      return res.status(403).json({ msg: "Not authorized" });

    reqDoc.status = "Rejected";
    await reqDoc.save();

    await Notification.deleteOne({ requestId: req.params.id });
    
    res.json({ msg: "Connection request rejected" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 🚫 Unsend Connection Request (cancel before accepted)
 */
router.delete("/unsend/:receiverId", fetchUser, async (req, res) => {
  try {
    const deleted = await ConnectionRequest.findOneAndDelete({
      sender: req.user.id,
      receiver: req.params.receiverId,
      status: "Pending",
    });
    if (!deleted)
      return res
        .status(404)
        .json({ msg: "Request not found or already accepted" });
    res.json({ msg: "Connection request unsent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 🔍 Get Connection Status by User ID
 * Returns the current relationship between logged-in user and another user
 */
router.get("/status/:partnerId", fetchUser, async (req, res) => {
  try {
    const { partnerId } = req.params;

    const request = await ConnectionRequest.findOne({
      $or: [
        { sender: req.user.id, receiver: partnerId },
        { sender: partnerId, receiver: req.user.id },
      ],
    });

    if (!request) {
      return res.json({ status: "none" }); // no request exists
    }

    res.json({
      status: request.status, // Pending / Accepted / Rejected
      sentByMe: request.sender.toString() === req.user.id,
      requestId: request._id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

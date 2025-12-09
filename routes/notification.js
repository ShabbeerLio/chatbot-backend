import express from "express";
import { fetchUser } from "../middleware/fetchUser.js";
import Notification from "../models/Notification.js";

const router = express.Router();

router.get("/", fetchUser, async (req, res) => {
  const notifications = await Notification.find({ user: req.user.id })
    .populate("fromUser", "name profilePic")
    .sort({ createdAt: -1 });
  res.json(notifications);
});

router.post("/read/:id", fetchUser, async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
  res.json({ msg: "Notification marked as read" });
});

export default router;
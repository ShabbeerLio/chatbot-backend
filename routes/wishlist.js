import express from "express";
import { fetchUser } from "../middleware/fetchUser.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { sendNotification } from "../app.js";

const router = express.Router();

router.post("/add/:userId", fetchUser, async (req, res) => {
  try {
    const { userId } = req.params;
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { wishlist: userId },
    });

    const newNotif = await Notification.create({
      user: userId,
      type: "wishlist_add",
      fromUser: req.user.id,
      message: "added you to their wishlist",
    });

    // ✅ Send via socket (real-time)
    sendNotification(userId, newNotif);

    res.json({ msg: "User added to wishlist" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", fetchUser, async (req, res) => {
  const user = await User.findById(req.user.id).populate(
    "wishlist",
    "name city profession profilePic"
  );
  res.json(user.wishlist);
});

router.delete("/remove/:userId", fetchUser, async (req, res) => {
  try {
    const { userId } = req.params;

    // Remove user from wishlist
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { wishlist: userId },
    });

    // Remove the corresponding notification
    const newNotif = await Notification.deleteMany({
      user: userId,
      fromUser: req.user.id,
      type: "wishlist_add",
    });

    // ✅ Send via socket (real-time)
    sendNotification(userId, newNotif);

    res.json({ msg: "User removed from wishlist and notification deleted" });
  } catch (err) {
    console.error("Remove wishlist error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

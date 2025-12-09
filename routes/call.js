import express from "express";
import { fetchUser } from "../middleware/fetchUser.js";
import Call from "../models/Call.js";

const router = express.Router();

// Get call history between logged user and partner
router.get("/history/:partnerId", fetchUser, async (req, res) => {
  try {
    const calls = await Call.find({
      $or: [
        { caller: req.user.id, receiver: req.params.partnerId },
        { caller: req.params.partnerId, receiver: req.user.id },
      ],
    })
      .sort({ startedAt: -1 })
      .select("-__v");

    res.json(calls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all call history for the logged user
router.get("/all", fetchUser, async (req, res) => {
  try {
    const calls = await Call.find({
      $or: [{ caller: req.user.id }, { receiver: req.user.id }],
    })
      .populate("caller receiver", "name profilePic")
      .sort({ startedAt: -1 });

    res.json(calls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
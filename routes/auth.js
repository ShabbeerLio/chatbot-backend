import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { fetchUser } from "../middleware/fetchUser.js";
import ConnectionRequest from "../models/ConnectionRequest.js";
import { Chat, Message } from "../models/Message.js";
import { uploadProfile, uploadImages } from "../utils/upload.js";
import Notification from "../models/Notification.js";

const router = express.Router();

// ✅ Register with Profile Picture Upload
router.post(
  "/register",
  uploadProfile.single("profilePic"),
  async (req, res) => {
    try {
      const { email, password, ...rest } = req.body;

      // 1️⃣ Check if user already exists
      let existing = await User.findOne({ email });
      if (existing)
        return res.status(400).json({ error: "User already exists" });

      // 2️⃣ Hash the password
      const salt = await bcrypt.genSalt(10);
      const secPass = await bcrypt.hash(req.body.password, salt);

      // 3️⃣ Handle profile picture (if uploaded)
      let profilePic = {};
      if (req.file && req.file.path) {
        profilePic = {
          url: req.file.path,
          isHidden: false,
          allowedUsers: [],
        };
      }

      // 4️⃣ Create user
      const user = new User({
        email,
        password: secPass,
        profilePic,
        ...rest,
      });

      await user.save();

      // 5️⃣ Generate token
      const token = jwt.sign(
        { user: { id: user._id } },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      console.log(user,"user")

      res.json({
        message: "User registered successfully",
        token,
        user,
      });
    } catch (err) {
      console.error("Register Error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// Login
router.post("/login", async (req, res) => {
  let success = false;
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid password" });

    const token = jwt.sign({ user: { id: user._id } }, process.env.JWT_SECRET);
    success = true;
    res.json({ success, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/me", fetchUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 👤 Get Particular User by ID
 */
router.get("/:id", fetchUser, async (req, res) => {
  try {
    const viewer = await User.findById(req.user.id);
    const user = await User.findById(req.params.id).select("-password"); // hide password always

    if (!user) return res.status(404).json({ msg: "User not found" });
    // ⛔ Block check
    if (
      user.blockedUsers.includes(viewer._id) ||
      viewer.blockedUsers.includes(user._id)
    ) {
      // Return LIMITED data only
      const age = user.dob?.year
        ? new Date().getFullYear() - Number(user.dob.year)
        : null;

      return res.status(200).json({
        blocked: true,
        name: user.name,
        age: age,
        profilePic: user.profilePic?.isHidden
          ? null
          : user.profilePic?.url || null,
        city: user.city,
        msg: "You have blocked this user or they blocked you",
      });
    }

    // Check if the requester is the same user or allowed
    const isOwner = user._id.toString() === viewer._id.toString();

    // Hide profile picture if privacy is enabled and viewer isn't allowed
    if (!isOwner && user.profilePic?.isHidden) {
      const allowed = user.profilePic.allowedUsers.some(
        (u) => u.toString() === req.user.id
      );
      if (!allowed) user.profilePic.url = null;
    }

    // Optionally hide email, mobile, etc. for non-owners
    if (!isOwner) {
      user.email = undefined;
      user.mobile = undefined;
    }

    res.json(user);
  } catch (err) {
    console.error("Error fetching user data:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ✏️ UPDATE Own Data
 */
router.put("/update", fetchUser, async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { $set: req.body }, // ✅ ensures nested objects are updated correctly
      { new: true, runValidators: true }
    ).select("-password");

    if (!updated) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "Profile updated successfully",
      user: updated,
    });

    // console.log("✅ Updated User:", updated);
  } catch (err) {
    // console.error("❌ Update Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 📸 Upload Profile Picture
 * POST /api/auth/profile
 */
router.post(
  "/profile",
  fetchUser,
  uploadProfile.single("profilePic"),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ msg: "User not found" });

      user.profilePic = { url: req.file.path, isHidden: false };
      await user.save();

      res.json({
        msg: "Profile picture uploaded successfully",
        profilePic: user.profilePic,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * 🖼️ Upload Gallery Images (Max 6)
 * POST /api/auth/images
 */
router.post(
  "/images",
  fetchUser,
  uploadImages.array("images", 6),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ msg: "User not found" });

      const urls = req.files.map((file) => file.path);
      user.images.push(...urls);
      if (user.images.length > 6) user.images = user.images.slice(-6); // keep last 6
      await user.save();

      res.json({ msg: "Images uploaded successfully", images: user.images });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * 🗑️ Delete a Specific Gallery Image
 * DELETE /api/upload/image/:index
 */
router.delete("/image/:index", fetchUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const index = parseInt(req.params.index);

    console.log(index, "index");

    if (isNaN(index) || index < 0 || index >= user.images.length)
      return res.status(400).json({ msg: "Invalid image index" });

    user.images.splice(index, 1);
    await user.save();

    res.json({ msg: "Image deleted", images: user.images });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// block user

router.get("/blocked", fetchUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate(
        "blockedUsers",
        "name profilePic gender city profession caste sect religion dob"
      )
      .select("blockedUsers");

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json({
      blockedCount: user.blockedUsers.length,
      blockedUsers: user.blockedUsers,
    });
  } catch (err) {
    console.error("Blocked Users Error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/block/:id", fetchUser, async (req, res) => {
  try {
    const blocker = await User.findById(req.user.id);
    const blockedId = req.params.id;

    if (!blocker) return res.status(404).json({ msg: "User not found" });
    if (blocker.blockedUsers.includes(blockedId))
      return res.status(400).json({ msg: "Already blocked" });

    // Add to block list
    blocker.blockedUsers.push(blockedId);
    await blocker.save();

    res.json({
      msg: "User blocked successfully",
      blockedUsers: blocker.blockedUsers,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/block/:id", fetchUser, async (req, res) => {
  try {
    const blocker = await User.findById(req.user.id);
    const blockedId = req.params.id;

    if (!blocker) return res.status(404).json({ msg: "User not found" });

    blocker.blockedUsers = blocker.blockedUsers.filter(
      (u) => u.toString() !== blockedId
    );
    await blocker.save();

    res.json({ msg: "User unblocked successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 👁️ Toggle Picture Visibility (Hide/Show)
 */

router.post("/request-picture/:id", fetchUser, async (req, res) => {
  try {
    const ownerId = req.params.id; // whose picture is hidden
    const requesterId = req.user.id; // who is requesting

    const owner = await User.findById(ownerId);
    if (!owner) return res.status(404).json({ msg: "User not found" });

    if (!owner.profilePic?.isHidden)
      return res.status(400).json({ msg: "Profile picture is already public" });

    // Already allowed?
    if (owner.profilePic.allowedUsers.includes(requesterId)) {
      return res.status(400).json({ msg: "You already have access" });
    }

    // 🔔 Create a notification for owner
    await Notification.create({
      user: ownerId,
      fromUser: requesterId,
      type: "profile_picture_request",
      message: "requested to view your profile picture",
    });

    res.json({ msg: "Request sent successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/approve-picture/:id", fetchUser, async (req, res) => {
  try {
    const requesterId = req.params.id; // user who requested
    const owner = await User.findById(req.user.id);

    if (!owner) return res.status(404).json({ msg: "User not found" });

    // Add requester to allowedUsers
    if (!owner.profilePic.allowedUsers.includes(requesterId)) {
      owner.profilePic.allowedUsers.push(requesterId);
      await owner.save();
    }

    // 🔔 Send notification to requester
    await Notification.create({
      user: requesterId,
      fromUser: owner._id,
      type: "profile_picture_approved",
      message: "approved your request to view their profile picture",
    });
    await Notification.deleteMany({
      user: owner._id, // owner received the request
      fromUser: requesterId, // requester who sent request
      type: "profile_picture_request",
    });

    res.json({ msg: "Request approved. User can now see your picture." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post("/reject-picture/:id", fetchUser, async (req, res) => {
  try {
    const requesterId = req.params.id;
    const owner = await User.findById(req.user.id);

    if (!owner) return res.status(404).json({ msg: "User not found" });

    // 🔔 Notification: rejected
    await Notification.create({
      user: requesterId,
      fromUser: owner._id,
      type: "profile_picture_rejected",
      message: "rejected your request to view their profile picture",
    });
    await Notification.deleteMany({
      user: owner._id, // owner received the request
      fromUser: requesterId, // requester who sent request
      type: "profile_picture_request",
    });

    res.json({ msg: "Request rejected" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 👁️ Toggle Picture Visibility (Hide/Show)
 */
router.put("/toggle-picture-privacy", fetchUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.profilePic || !user.profilePic.url)
      return res.status(400).json({ msg: "No profile picture found" });

    user.profilePic.isHidden = !user.profilePic.isHidden;
    await user.save();

    res.json({
      msg: `Profile picture is now ${
        user.profilePic.isHidden ? "hidden" : "visible"
      }`,
      profilePic: user.profilePic,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 🗑️ DELETE Own Account
 */
router.delete("/delete", fetchUser, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    await ConnectionRequest.deleteMany({
      $or: [{ sender: req.user.id }, { receiver: req.user.id }],
    });
    await Chat.deleteMany({ participants: req.user.id });
    await Message.deleteMany({ sender: req.user.id });
    res.json({ msg: "Account deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

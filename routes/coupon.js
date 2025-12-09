import express from "express";
import Coupon from "../models/Coupon.js";
import { isAdmin } from "../middleware/isAdmi.js";
import { fetchUser } from "../middleware/fetchUser.js";

const router = express.Router();

router.get("/getall", async (req, res) => {
  try {
    const coupons = await Coupon.find({ status: "enable" }).sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * ADMIN — Get all coupons (active + inactive)
 */
router.get("/all", fetchUser, isAdmin, async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/** -----------------------------------------
 *  CREATE COUPON
 * -----------------------------------------
 */
router.post("/create", fetchUser, isAdmin, async (req, res) => {
  try {
    const coupon = await Coupon.create(req.body);
    res.json({ msg: "Coupon created", coupon });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** -----------------------------------------
 *  EDIT COUPON
 * -----------------------------------------
 */
router.put("/edit/:id", fetchUser, isAdmin, async (req, res) => {
  try {
    const updated = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json({ msg: "Coupon updated", coupon: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** -----------------------------------------
 *  DELETE COUPON
 * -----------------------------------------
 */
router.delete("/delete/:id", fetchUser, isAdmin, async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ msg: "Coupon deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** -----------------------------------------
 *  ACTIVATE COUPON
 * -----------------------------------------
 */
router.post("/activate/:id", fetchUser, isAdmin, async (req, res) => {
  try {
    await Coupon.findByIdAndUpdate(req.params.id, { status: "enable" });
    res.json({ msg: "Coupon Activated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** -----------------------------------------
 *  DEACTIVATE COUPON
 * -----------------------------------------
 */
router.post("/deactivate/:id", fetchUser, isAdmin, async (req, res) => {
  try {
    await Coupon.findByIdAndUpdate(req.params.id, { status: "disable" });
    res.json({ msg: "Coupon Deactivated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
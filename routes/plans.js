import express from "express";
import Plan from "../models/Plan.js";
import { isAdmin } from "../middleware/isAdmi.js";
import { fetchUser } from "../middleware/fetchUser.js";

const router = express.Router();

/**
 * PUBLIC — Get all active plans (for all users)
 */
router.get("/getall", async (req, res) => {
  try {
    const plans = await Plan.find({ status: "active" });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * ADMIN — Get all plans (active + inactive)
 */
router.get("/all", fetchUser, isAdmin, async (req, res) => {
  try {
    const plans = await Plan.find().sort({ createdAt: -1 });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** -----------------------------------------
 *  CREATE PLAN
 * -----------------------------------------
 */
router.post("/create", fetchUser, isAdmin, async (req, res) => {
  try {
    const newPlan = await Plan.create(req.body);
    res.json({ msg: "Plan created", plan: newPlan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** -----------------------------------------
 *  EDIT PLAN
 * -----------------------------------------
 */
router.put("/edit/:id", fetchUser, isAdmin, async (req, res) => {
  try {
    const updated = await Plan.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json({ msg: "Plan updated", plan: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** -----------------------------------------
 *  DELETE PLAN
 * -----------------------------------------
 */
router.delete("/delete/:id", fetchUser, isAdmin, async (req, res) => {
  try {
    await Plan.findByIdAndDelete(req.params.id);
    res.json({ msg: "Plan deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** -----------------------------------------
 *  ENABLE PLAN
 * -----------------------------------------
 */
router.post("/enable/:id", fetchUser, isAdmin, async (req, res) => {
  try {
    await Plan.findByIdAndUpdate(req.params.id, { status: "active" });
    res.json({ msg: "Plan Enabled" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** -----------------------------------------
 *  DISABLE PLAN
 * -----------------------------------------
 */
router.post("/disable/:id", fetchUser, isAdmin, async (req, res) => {
  try {
    await Plan.findByIdAndUpdate(req.params.id, { status: "inactive" });
    res.json({ msg: "Plan Disabled" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
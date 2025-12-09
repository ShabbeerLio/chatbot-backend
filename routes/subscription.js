import express from "express";
import Plan from "../models/Plan.js";
import Coupon from "../models/Coupon.js";
import User from "../models/User.js";
import { fetchUser } from "../middleware/fetchUser.js";

const router = express.Router();

/** -----------------------------------------
 *  SUBSCRIBE USER
 * -----------------------------------------
 */
router.post("/subscribe", fetchUser, async (req, res) => {
  try {
    const { planId, couponCode } = req.body;

    const plan = await Plan.findById(planId);
    if (!plan || plan.status !== "active")
      return res.status(400).json({ msg: "Invalid or inactive plan" });

    let finalPrice = plan.slprice;
    let discountAmount = 0;
    let couponDescount = ''

    // Apply coupon if exists
    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode,
        status: "enable",
      });

      if (!coupon) return res.status(400).json({ msg: "Invalid coupon" });
      couponDescount = coupon.discount;

      discountAmount = (finalPrice * coupon.discount) / 100;
      finalPrice -= discountAmount;
    }

    // Calculate expiry
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + plan.duration);

    // Save full subscription details
    await User.findByIdAndUpdate(req.user.id, {
      subscription: {
        plan: plan.title,
        price: plan.price,
        slprice: plan.slprice,
        duration: plan.duration,
        finalPrice,
        discount: couponDescount,
        expiry,
      },
    });

    res.json({
      msg: "Subscription active",
      subscription: {
        plan: plan.title,
        price: plan.price,
        slprice: plan.slprice,
        duration: plan.duration,
        finalPrice,
        discount: couponDescount,
        expiry,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** -----------------------------------------
 *  UNSUBSCRIBE USER
 * -----------------------------------------
 */
router.post("/unsubscribe", fetchUser, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      subscription: {
        plan: "Free",
        price: 0,
        slprice: 0,
        duration: 0,
        finalPrice: 0,
        discount: 0,
        expiry: null,
      },
    });

    res.json({ msg: "Unsubscribed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get("/history", fetchUser, async (req, res) => {
  const history = await SubscriptionHistory.find({ userId: req.user._id })
    .populate("planId", "title price slprice duration")
    .sort({ createdAt: -1 });

  res.json(history);
});

export default router;

import express from "express";
import Plan from "../models/Plan.js";
import Coupon from "../models/Coupon.js";
import User from "../models/User.js";
import { fetchUser } from "../middleware/fetchUser.js";
import crypto from "crypto";
import SubscriptionHistory from "../models/SubscriptionHistory.js";

const generatePhonePeChecksum = (payload, key) => {
  const data = payload + "/pg/v1/pay" + key;
  return crypto.createHash("sha256").update(data).digest("hex");
};
const router = express.Router();

router.post("/initiate-payment", fetchUser, async (req, res) => {
  try {
    const { planId, couponCode } = req.body;

    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ msg: "Plan not found" });

    let amount = plan.slprice * 100; // PhonePe needs paise

    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode,
        status: "enable",
      });
      if (coupon) {
        amount -= (amount * coupon.discount) / 100;
      }
    }

    const orderId = "ORD" + Date.now();

    // Save history
    await SubscriptionHistory.create({
      userId: req.user._id,
      planId,
      couponCode,
      amount,
      orderId,
    });

    const payload = {
      merchantId: process.env.PHONEPE_MERCHANT_ID,
      merchantTransactionId: orderId,
      amount: amount,
      redirectUrl: process.env.FRONTEND_RETURN_URL + "?orderId=" + orderId,
      redirectMode: "POST",
      callbackUrl: process.env.CALLBACK_URL,
      mobileNumber: req.user.mobile || "9999999999",
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    const payloadString = Buffer.from(JSON.stringify(payload)).toString(
      "base64"
    );
    const checksum = generatePhonePeChecksum(
      payloadString,
      process.env.PHONEPE_MERCHANT_KEY
    );

    const response = await fetch(process.env.PHONEPE_BASE_URL + "/pg/v1/pay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
        "X-MERCHANT-ID": process.env.PHONEPE_MERCHANT_ID,
      },
      body: JSON.stringify({ request: payloadString }),
    });

    const data = await response.json();

    if (!data.success) return res.status(400).json(data);

    res.json({
      msg: "Payment Initiated",
      paymentURL: data.data.instrumentResponse.redirectInfo.url,
      orderId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/phonepe/callback", async (req, res) => {
  try {
    const { merchantTransactionId, code } = req.body;

    const history = await SubscriptionHistory.findOne({
      orderId: merchantTransactionId,
    });
    if (!history) return res.status(404).json({ msg: "Order not found" });

    if (code === "PAYMENT_SUCCESS") {
      history.paymentStatus = "SUCCESS";
      await history.save();

      // Activate subscription
      const plan = await Plan.findById(history.planId);
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + plan.duration);

      await User.findByIdAndUpdate(history.userId, {
        subscription: {
          plan: plan.title,
          price: plan.price,
          slprice: plan.slprice,
          duration: plan.duration,
          finalPrice: history.amount / 100,
          expiry,
        },
      });
    } else {
      history.paymentStatus = "FAILED";
      await history.save();
    }

    return res.json({ msg: "Callback received" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

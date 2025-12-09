import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const fetchUser = async (req, res, next) => {
  const token = req.header("auth-token");
  if (!token) return res.status(401).json({ error: "Access denied" });

  try {
    const data = jwt.verify(token, process.env.JWT_SECRET);

    // ⬅ fetch full user object from DB
    const user = await User.findById(data.user.id);

    if (!user) return res.status(401).json({ error: "User not found" });

    req.user = user;  // full user doc
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};
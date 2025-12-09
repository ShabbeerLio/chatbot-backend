export const isAdmin = (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ msg: "Access Denied: Admin Only" });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

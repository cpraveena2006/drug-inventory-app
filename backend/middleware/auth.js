import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token provided" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "User no longer exists" });
    }
    if (user.role === "supplier" && !user.supplier) {
      return res.status(403).json({
        message: "Supplier account is not linked to a supplier record",
        code: "SUPPLIER_NOT_LINKED",
      });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Not authorized, invalid or expired token" });
  }
};

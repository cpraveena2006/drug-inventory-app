// Usage: restrictTo("admin", "pharmacist")
export const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Requires role: ${allowedRoles.join(" or ")}`,
      });
    }
    next();
  };
};

import AppError from "../utils/AppError.js";

export function notFoundHandler(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, "NOT_FOUND"));
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let error = err;
  if (err.name === "ValidationError") {
    error = new AppError("Request validation failed", 400, "VALIDATION_ERROR", err.errors);
  } else if (err.code === 11000) {
    error = new AppError("A record with this value already exists", 409, "DUPLICATE_KEY", err.keyValue);
  } else if (err.name === "CastError") {
    error = new AppError(`Invalid ${err.path}`, 400, "INVALID_ID");
  } else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    error = new AppError("Not authorized, invalid or expired token", 401, "UNAUTHORIZED");
  } else if (!(err instanceof AppError)) {
    error = new AppError("An unexpected server error occurred", 500, "INTERNAL_ERROR");
  }

  req.log?.error({ err, code: error.code }, error.message);
  res.status(error.statusCode || 500).json({
    message: error.message,
    code: error.code || "INTERNAL_ERROR",
    ...(error.details ? { details: error.details } : {}),
  });
}

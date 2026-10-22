import AppError from "../utils/AppError.js";

export default function validateRequest(schemas) {
  return (req, res, next) => {
    const details = {};
    for (const key of ["body", "params", "query"]) {
      if (!schemas[key]) continue;
      const result = schemas[key].safeParse(req[key]);
      if (!result.success) {
        details[key] = result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        }));
      } else if (key !== "query") req[key] = result.data;
    }
    if (Object.keys(details).length) {
      return next(new AppError("Request validation failed", 400, "VALIDATION_ERROR", details));
    }
    return next();
  };
}

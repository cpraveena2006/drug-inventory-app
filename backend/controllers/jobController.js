import { runExpiryCheck } from "../services/expiryService.js";

export async function runExpiryJob(req, res) {
  const result = await runExpiryCheck(req.user._id);
  res.json(result);
}

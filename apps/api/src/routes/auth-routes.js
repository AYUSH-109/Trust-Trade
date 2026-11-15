import { Router } from "express";
import { createChallenge, verifyChallenge } from "../services/auth-service.js";

const router = Router();

router.post("/challenge", async (request, response) => {
  const wallet = request.body?.wallet;

  if (typeof wallet !== "string") {
    return response.status(400).json({ error: "Wallet address is required" });
  }

  try {
    return response.json({ data: await createChallenge(wallet) });
  } catch (error) {
    console.error("Failed to create wallet challenge", error);
    return response.status(400).json({ error: "Invalid wallet address" });
  }
});

router.post("/verify", async (request, response) => {
  const { wallet, nonce, signature } = request.body ?? {};

  if (
    typeof wallet !== "string" ||
    typeof nonce !== "string" ||
    typeof signature !== "string"
  ) {
    return response.status(400).json({
      error: "Wallet, nonce, and signature are required"
    });
  }

  try {
    return response.json({
      data: await verifyChallenge({ wallet, nonce, signature })
    });
  } catch (error) {
    console.error("Failed to verify wallet challenge", error);
    return response.status(401).json({ error: "Wallet authentication failed" });
  }
});

export default router;

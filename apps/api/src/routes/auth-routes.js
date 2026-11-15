import { Router } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import {
  createChallenge,
  findUserById,
  verifyChallenge
} from "../services/auth-service.js";

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

router.get("/me", requireAuth, async (request, response) => {
  try {
    const user = await findUserById(request.auth.sub);

    if (!user) {
      return response.status(401).json({ error: "User no longer exists" });
    }

    return response.json({ data: user });
  } catch (error) {
    console.error("Failed to load authenticated user", error);
    return response.status(500).json({ error: "Unable to load authenticated user" });
  }
});

export default router;

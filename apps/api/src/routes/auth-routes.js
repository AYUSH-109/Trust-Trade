import { Router } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import {
  createChallenge,
  findUserById,
  updateUserProfile,
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

router.patch("/me", requireAuth, async (request, response) => {
  const { name, email, phone, contactInfo } = request.body ?? {};
  if (![name, email, phone, contactInfo].every((value) => value === undefined || typeof value === "string")) {
    return response.status(400).json({ error: "Profile fields must be text values" });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return response.status(400).json({ error: "Enter a valid email address" });
  }

  try {
    const result = await updateUserProfile(request.auth.sub, { name, email, phone, contactInfo });
    if (result.status === "email_taken") {
      return response.status(409).json({ error: "That email is already used by another profile" });
    }
    return response.json({ data: result.user });
  } catch (error) {
    console.error("Failed to update profile", error);
    return response.status(500).json({ error: "Unable to update profile" });
  }
});

export default router;

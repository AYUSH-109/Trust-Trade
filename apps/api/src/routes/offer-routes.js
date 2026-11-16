import { Router } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import {
  createMessage,
  createOffer,
  findMessages,
  findOffers,
  updateOfferStatus
} from "../services/offer-service.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (request, response) => {
  try {
    return response.json({ data: await findOffers(request.auth.sub) });
  } catch (error) {
    console.error("Failed to fetch offers", error);
    return response.status(500).json({ error: "Unable to fetch offers" });
  }
});

router.post("/", async (request, response) => {
  const { listingId, amount, message } = request.body ?? {};
  if (typeof listingId !== "string" || typeof amount !== "string" || Number(amount) <= 0) {
    return response.status(400).json({ error: "Listing and positive offer amount are required" });
  }

  try {
    const result = await createOffer({
      listingId,
      buyerId: request.auth.sub,
      amount,
      message: typeof message === "string" && message.trim() ? message.trim() : null
    });
    if (result.status === "not_found") return response.status(404).json({ error: "Listing not found" });
    if (result.status === "own_listing") return response.status(403).json({ error: "You cannot offer on your own listing" });
    if (result.status === "unavailable") return response.status(409).json({ error: "Listing is not available" });
    return response.status(201).json({ data: result.offer });
  } catch (error) {
    console.error("Failed to create offer", error);
    return response.status(500).json({ error: "Unable to create offer" });
  }
});

router.patch("/:id", async (request, response) => {
  const status = request.body?.status;
  if (!["ACCEPTED", "REJECTED"].includes(status)) {
    return response.status(400).json({ error: "Offer status must be ACCEPTED or REJECTED" });
  }

  try {
    const result = await updateOfferStatus(request.params.id, request.auth.sub, status);
    if (result.status === "not_found") return response.status(404).json({ error: "Offer not found" });
    if (result.status === "forbidden") return response.status(403).json({ error: "Only the seller can update this offer" });
    if (result.status === "invalid_state") return response.status(409).json({ error: "Offer is no longer pending" });
    return response.json({ data: result.offer });
  } catch (error) {
    if (error.message === "Listing is no longer available" || error.message === "Listing already has an order") {
      return response.status(409).json({ error: error.message });
    }
    console.error("Failed to update offer", error);
    return response.status(500).json({ error: "Unable to update offer" });
  }
});

router.post("/messages", async (request, response) => {
  const { listingId, recipientId, body } = request.body ?? {};
  if (
    typeof listingId !== "string" ||
    typeof recipientId !== "string" ||
    typeof body !== "string" ||
    !body.trim()
  ) {
    return response.status(400).json({ error: "Listing, recipient, and message are required" });
  }

  try {
    const message = await createMessage({
      listingId,
      recipientId,
      senderId: request.auth.sub,
      body: body.trim()
    });
    return response.status(201).json({ data: message });
  } catch (error) {
    console.error("Failed to create message", error);
    return response.status(500).json({ error: "Unable to create message" });
  }
});

router.get("/messages/:conversationId", async (request, response) => {
  try {
    const result = await findMessages(request.auth.sub, request.params.conversationId);
    if (result.status === "not_found") return response.status(404).json({ error: "Conversation not found" });
    return response.json({ data: result.messages });
  } catch (error) {
    console.error("Failed to fetch messages", error);
    return response.status(500).json({ error: "Unable to fetch messages" });
  }
});

export default router;

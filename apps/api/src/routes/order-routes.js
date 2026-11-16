import { Router } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import {
  createOrder,
  findOrders,
  updateOrderStatus
} from "../services/order-service.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (request, response) => {
  try {
    return response.json({ data: await findOrders(request.auth.sub) });
  } catch (error) {
    console.error("Failed to fetch orders", error);
    return response.status(500).json({ error: "Unable to fetch orders" });
  }
});

router.post("/", async (request, response) => {
  const { offerId } = request.body ?? {};
  if (typeof offerId !== "string") {
    return response.status(400).json({ error: "Accepted offer is required" });
  }

  try {
    const result = await createOrder({
      offerId,
      buyerId: request.auth.sub,
    });
    if (result.status === "not_found") return response.status(404).json({ error: "Offer not found" });
    if (result.status === "forbidden") return response.status(403).json({ error: "Only the buyer can create this order" });
    if (result.status === "invalid_offer") return response.status(409).json({ error: "Offer must be accepted before creating an order" });
    return response.status(result.status === "exists" ? 200 : 201).json({ data: result.order });
  } catch (error) {
    console.error("Failed to create order", error);
    return response.status(500).json({ error: "Unable to create order" });
  }
});

router.patch("/:id", async (request, response) => {
  const status = request.body?.status;
  if (!["FUNDED", "SHIPPED", "DELIVERED", "DISPUTED"].includes(status)) {
    return response.status(400).json({ error: "Unsupported order status" });
  }

  try {
    const result = await updateOrderStatus(
      request.params.id,
      request.auth.sub,
      status,
      request.body?.escrowId,
      request.body?.fundingTxHash
    );
    if (result.status === "not_found") return response.status(404).json({ error: "Order not found" });
    if (result.status === "forbidden") return response.status(403).json({ error: "You cannot update this order" });
    if (result.status === "invalid_state") return response.status(409).json({ error: "Invalid order state transition" });
    return response.json({ data: result.order });
  } catch (error) {
    console.error("Failed to update order", error);
    return response.status(500).json({ error: "Unable to update order" });
  }
});

export default router;

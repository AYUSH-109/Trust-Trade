import { Router } from "express";
import { getEthInrQuote } from "../services/market-service.js";

const router = Router();

router.get("/eth-inr", async (_request, response) => {
  try {
    const quote = await getEthInrQuote();
    return response.json({
      data: {
        ethInr: quote.ethInr,
        ratePaise: quote.ratePaise,
        fetchedAt: quote.fetchedAt,
        expiresAt: new Date(quote.expiresAt).toISOString()
      }
    });
  } catch (error) {
    console.error("Failed to fetch ETH/INR quote", error);
    return response.status(503).json({
      error: "Live ETH/INR pricing is temporarily unavailable"
    });
  }
});

export default router;

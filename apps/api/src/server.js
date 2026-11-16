import "dotenv/config";
import cors from "cors";
import express from "express";
import { prisma } from "database";
import authRoutes from "./routes/auth-routes.js";
import listingRoutes from "./routes/listing-routes.js";
import marketRoutes from "./routes/market-routes.js";
import offerRoutes from "./routes/offer-routes.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/offers", offerRoutes);

app.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "trust-trade-api"
  });
});

app.get("/health/database", async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    response.json({
      status: "ok",
      service: "trust-trade-database"
    });
  } catch (error) {
    console.error("Database health check failed", error);

    response.status(503).json({
      status: "error",
      service: "trust-trade-database"
    });
  }
});

app.listen(port, () => {
  console.log(`Trust Trade API listening on http://localhost:${port}`);
});
import { Router } from "express";
import {
  createListing,
  deleteListing,
  findListingById,
  findListings,
  updateListing
} from "../services/listing-service.js";
import {
  getListingData,
  validateCreateListing,
  validateUpdateListing
} from "../validation/listing.js";

const router = Router();

function hasPrismaCode(error, code) {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

function parsePagination(value, fallback, maximum) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

router.post("/", async (request, response) => {
  const body = request.body ?? {};
  const errors = validateCreateListing(body);

  if (Object.keys(errors).length > 0) {
    return response.status(400).json({ errors });
  }

  try {
    const listing = await createListing(
      getListingData(request.body, { includeSellerId: true })
    );
    return response.status(201).json({ data: listing });
  } catch (error) {
    console.error("Failed to create listing", error);
    if (hasPrismaCode(error, "P2003")) {
      return response.status(400).json({ error: "Seller not found" });
    }
    return response.status(500).json({ error: "Unable to create listing" });
  }
});

router.get("/", async (request, response) => {
  const page = parsePagination(request.query.page, 1, 1000000);
  const limit = parsePagination(request.query.limit, 20, 100);
  const status = request.query.status;

  if (status && !["ACTIVE", "SOLD", "RESERVED", "REMOVED"].includes(status)) {
    return response.status(400).json({ error: "Status is invalid" });
  }

  try {
    const result = await findListings({
      search: typeof request.query.search === "string" ? request.query.search.trim() : undefined,
      category: typeof request.query.category === "string" ? request.query.category.trim() : undefined,
      status,
      page,
      limit
    });

    return response.json(result);
  } catch (error) {
    console.error("Failed to fetch listings", error);
    return response.status(500).json({ error: "Unable to fetch listings" });
  }
});

router.get("/:id", async (request, response) => {
  try {
    const listing = await findListingById(request.params.id);

    if (!listing) {
      return response.status(404).json({ error: "Listing not found" });
    }

    return response.json({ data: listing });
  } catch (error) {
    console.error("Failed to fetch listing", error);
    return response.status(500).json({ error: "Unable to fetch listing" });
  }
});

router.patch("/:id", async (request, response) => {
  const body = request.body ?? {};
  const errors = validateUpdateListing(body);

  if (Object.keys(errors).length > 0) {
    return response.status(400).json({ errors });
  }

  try {
    const listing = await updateListing(
      request.params.id,
      getListingData(body)
    );
    return response.json({ data: listing });
  } catch (error) {
    console.error("Failed to update listing", error);
    return response.status(404).json({ error: "Listing not found" });
  }
});

router.delete("/:id", async (request, response) => {
  try {
    await deleteListing(request.params.id);
    return response.status(204).send();
  } catch (error) {
    console.error("Failed to delete listing", error);
    return response.status(404).json({ error: "Listing not found" });
  }
});

export default router;

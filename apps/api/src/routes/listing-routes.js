import { Router } from "express";
import listingImageUpload from "../middleware/listing-upload.js";
import {
  createListing,
  findListingById,
  findListings
} from "../services/listing-service.js";
import {
  deleteListingImage,
  uploadListingImage
} from "../services/image-upload-service.js";
import {
  getListingData,
  validateCreateListing
} from "../validation/listing.js";

const router = Router();

function hasPrismaCode(error, code) {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

router.get("/", async (_request, response) => {
  try {
    const listings = await findListings();
    return response.json({ data: listings });
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

router.post("/", listingImageUpload.array("images", 5), async (request, response) => {
  const body = request.body ?? {};
  const errors = validateCreateListing(body);

  if (Object.keys(errors).length > 0) {
    return response.status(400).json({ errors });
  }

  const uploadedImages = [];

  try {
    for (const file of request.files ?? []) {
      uploadedImages.push(await uploadListingImage(file));
    }

    const listing = await createListing(
      getListingData(body, { includeSellerId: true }),
      uploadedImages
    );

    return response.status(201).json({ data: listing });
  } catch (error) {
    console.error("Failed to create listing", error);

    await Promise.all(
      uploadedImages.map((image) => deleteListingImage(image.publicId))
    ).catch((cleanupError) => {
      console.error("Failed to clean up uploaded listing images", cleanupError);
    });

    if (hasPrismaCode(error, "P2003")) {
      return response.status(400).json({ error: "Seller not found" });
    }

    return response.status(500).json({ error: "Unable to create listing" });
  }
});

export default router;

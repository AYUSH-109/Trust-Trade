const listingStatuses = new Set(["ACTIVE", "SOLD", "RESERVED", "REMOVED"]);

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validatePrice(value) {
  if (typeof value !== "string" && typeof value !== "number") {
    return false;
  }

  const price = Number(value);
  return Number.isFinite(price) && price >= 0;
}

export function validateCreateListing(input) {
  const errors = {};

  if (!isNonEmptyString(input.title)) errors.title = "Title is required";
  if (!isNonEmptyString(input.description)) errors.description = "Description is required";
  if (!validatePrice(input.price)) errors.price = "Price must be a non-negative number";
  if (!isNonEmptyString(input.category)) errors.category = "Category is required";
  if (!isNonEmptyString(input.sellerId)) errors.sellerId = "Seller ID is required";

  return errors;
}

export function validateUpdateListing(input) {
  const errors = {};

  if ("title" in input && !isNonEmptyString(input.title)) {
    errors.title = "Title must be a non-empty string";
  }
  if ("description" in input && !isNonEmptyString(input.description)) {
    errors.description = "Description must be a non-empty string";
  }
  if ("price" in input && !validatePrice(input.price)) {
    errors.price = "Price must be a non-negative number";
  }
  if ("category" in input && !isNonEmptyString(input.category)) {
    errors.category = "Category must be a non-empty string";
  }
  if ("status" in input && !listingStatuses.has(input.status)) {
    errors.status = "Status is invalid";
  }
  if ("imageUrl" in input && input.imageUrl !== null && !isNonEmptyString(input.imageUrl)) {
    errors.imageUrl = "Image URL must be a non-empty string or null";
  }

  return errors;
}

export function getListingData(input, { includeSellerId = false } = {}) {
  const data = {};
  const fields = ["title", "description", "category", "imageUrl"];

  for (const field of fields) {
    if (field in input) {
      data[field] = typeof input[field] === "string" ? input[field].trim() : input[field];
    }
  }

  if (includeSellerId && "sellerId" in input) {
    data.sellerId = input.sellerId.trim();
  }
  if ("price" in input) data.price = String(input.price);
  if ("status" in input) data.status = input.status;

  return data;
}

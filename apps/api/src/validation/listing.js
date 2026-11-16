function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidPrice(value) {
  if (typeof value !== "string" && typeof value !== "number") {
    return false;
  }

  const price = Number(value);
  return Number.isFinite(price) && price >= 0;
}

export function validateCreateListing(input) {
  const errors = {};

  if (!isNonEmptyString(input.title)) {
    errors.title = "Title is required";
  }

  if (!isValidPrice(input.price)) {
    errors.price = "Price must be a non-negative number";
  }

  if (!isNonEmptyString(input.category)) {
    errors.category = "Category is required";
  }

  return errors;
}

export function getListingData(input, sellerId) {
  const data = {};
  const fields = ["title", "category"];
  if ("description" in input) {
    data.description = input.description.trim() || null;
  }

  for (const field of fields) {
    if (field in input) {
      data[field] = input[field].trim();
    }
  }

  data.price = String(input.price);

  data.sellerId = sellerId;

  return data;
}

export function validateUpdateListing(input) {
  const errors = {};

  if (Object.keys(input).length === 0) {
    errors.form = "At least one listing field is required";
  }

  if ("title" in input && !isNonEmptyString(input.title)) {
    errors.title = "Title must be a non-empty string";
  }
  if ("description" in input && !isNonEmptyString(input.description)) {
    errors.description = "Description must be a non-empty string";
  }
  if ("price" in input && !isValidPrice(input.price)) {
    errors.price = "Price must be a non-negative number";
  }
  if ("category" in input && !isNonEmptyString(input.category)) {
    errors.category = "Category must be a non-empty string";
  }

  return errors;
}

export function getListingUpdateData(input) {
  const data = {};
  const fields = ["title", "description", "category"];

  for (const field of fields) {
    if (field in input) data[field] = input[field].trim();
  }

  if ("price" in input) data.price = String(input.price);
  return data;
}

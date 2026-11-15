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

  if (!isNonEmptyString(input.description)) {
    errors.description = "Description is required";
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
  const fields = ["title", "description", "category"];

  for (const field of fields) {
    if (field in input) {
      data[field] = input[field].trim();
    }
  }

  data.price = String(input.price);

  data.sellerId = sellerId;

  return data;
}

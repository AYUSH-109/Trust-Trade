import { prisma } from "database";

const listingSelection = {
  id: true,
  title: true,
  description: true,
  price: true,
  category: true,
  status: true,
  sellerId: true,
  createdAt: true,
  updatedAt: true,
  images: {
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      url: true,
      publicId: true,
      sortOrder: true
    }
  },
  seller: {
    select: {
      id: true,
      wallet: true,
      name: true
    }
  }
};

function serializeListing(listing) {
  return {
    ...listing,
    description: listing.description ?? "",
    price: listing.price.toString()
  };
}

export async function createListing(data, images = []) {
  const listing = await prisma.listing.create({
    data: {
      ...data,
      images: {
        create: images.map((image, sortOrder) => ({
          url: image.url,
          publicId: image.publicId,
          sortOrder
        }))
      }
    },
    select: listingSelection
  });

  return serializeListing(listing);
}

export async function findListings() {
  const listings = await prisma.listing.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: listingSelection
  });

  return listings.map(serializeListing);
}

export async function findListingById(id) {
  const listing = await prisma.listing.findUnique({
    where: { id },
    select: listingSelection
  });

  return listing ? serializeListing(listing) : null;
}

export async function updateListing(id, sellerId, data) {
  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { sellerId: true }
  });

  if (!listing) return { status: "not_found" };
  if (listing.sellerId !== sellerId) return { status: "forbidden" };

  const updatedListing = await prisma.listing.update({
    where: { id },
    data,
    select: listingSelection
  });

  return { status: "updated", listing: serializeListing(updatedListing) };
}

export async function deleteListing(id, sellerId) {
  const listing = await prisma.listing.findUnique({
    where: { id },
    select: {
      sellerId: true,
      images: { select: { publicId: true } }
    }
  });

  if (!listing) return { status: "not_found" };
  if (listing.sellerId !== sellerId) return { status: "forbidden" };

  await prisma.listing.delete({ where: { id } });
  return { status: "deleted", imagePublicIds: listing.images.map((image) => image.publicId) };
}

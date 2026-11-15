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
    orderBy: { createdAt: "desc" },
    select: listingSelection
  });

  return listings.map(serializeListing);
}

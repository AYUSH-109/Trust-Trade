import { prisma } from "database";

const listingSelection = {
  id: true,
  title: true,
  description: true,
  price: true,
  category: true,
  status: true,
  imageUrl: true,
  sellerId: true,
  createdAt: true,
  updatedAt: true,
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

export async function createListing(data) {
  const listing = await prisma.listing.create({
    data,
    select: listingSelection
  });

  return serializeListing(listing);
}

export async function findListings({ search, category, status, page, limit }) {
  const where = {};

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } }
    ];
  }
  if (category) where.category = category;
  if (status) where.status = status;

  const [listings, total] = await prisma.$transaction([
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: listingSelection
    }),
    prisma.listing.count({ where })
  ]);

  return {
    data: listings.map(serializeListing),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function findListingById(id) {
  const listing = await prisma.listing.findUnique({
    where: { id },
    select: listingSelection
  });

  return listing ? serializeListing(listing) : null;
}

export async function updateListing(id, data) {
  const listing = await prisma.listing.update({
    where: { id },
    data,
    select: listingSelection
  });

  return serializeListing(listing);
}

export function deleteListing(id) {
  return prisma.listing.delete({ where: { id } });
}

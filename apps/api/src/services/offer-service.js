import { prisma } from "database";

const offerSelection = {
  id: true,
  amount: true,
  message: true,
  status: true,
  listingId: true,
  buyerId: true,
  sellerId: true,
  createdAt: true,
  updatedAt: true,
  listing: { select: { id: true, title: true, price: true } },
  buyer: { select: { id: true, wallet: true, name: true } },
  seller: { select: { id: true, wallet: true, name: true } }
};

function serializeOffer(offer) {
  return {
    ...offer,
    amount: offer.amount.toString(),
    listing: { ...offer.listing, price: offer.listing.price.toString() }
  };
}

export async function createOffer({ listingId, buyerId, amount, message }) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { sellerId: true, status: true }
  });
  if (!listing) return { status: "not_found" };
  if (listing.sellerId === buyerId) return { status: "own_listing" };
  if (listing.status !== "ACTIVE") return { status: "unavailable" };

  const offer = await prisma.offer.create({
    data: { listingId, buyerId, sellerId: listing.sellerId, amount, message },
    select: offerSelection
  });
  return { status: "created", offer: serializeOffer(offer) };
}

export async function findOffers(userId) {
  const offers = await prisma.offer.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    orderBy: { createdAt: "desc" },
    select: offerSelection
  });
  return offers.map(serializeOffer);
}

export async function updateOfferStatus(id, userId, status) {
  const offer = await prisma.offer.findUnique({ where: { id } });
  if (!offer) return { status: "not_found" };
  if (offer.sellerId !== userId) return { status: "forbidden" };
  if (offer.status !== "PENDING") return { status: "invalid_state" };

  const updated = await prisma.$transaction(async (transaction) => {
    const listing = await transaction.listing.findUnique({
      where: { id: offer.listingId },
      select: { status: true }
    });
    if (!listing || listing.status !== "ACTIVE") throw new Error("Listing is no longer available");

    const existingOrder = await transaction.order.findFirst({
      where: { listingId: offer.listingId }
    });
    if (existingOrder) throw new Error("Listing already has an order");

    const accepted = await transaction.offer.update({
      where: { id },
      data: { status },
      select: offerSelection
    });
    if (status === "ACCEPTED") {
      await transaction.order.create({
        data: {
          offerId: id,
          listingId: offer.listingId,
          buyerId: offer.buyerId,
          sellerId: offer.sellerId
        }
      });
      await transaction.listing.update({
        where: { id: offer.listingId },
        data: { status: "RESERVED" }
      });
      await transaction.offer.updateMany({
        where: {
          listingId: offer.listingId,
          id: { not: id },
          status: "PENDING"
        },
        data: { status: "REJECTED" }
      });
    }
    return accepted;
  });
  return { status: "updated", offer: serializeOffer(updated) };
}

export async function createMessage({ listingId, recipientId, senderId, body }) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { sellerId: true }
  });
  if (!listing || listing.sellerId === senderId && recipientId === listing.sellerId) {
    throw new Error("Invalid conversation participants");
  }

  const buyerId = listing.sellerId === senderId ? recipientId : senderId;
  const sellerId = listing.sellerId;
  if (recipientId !== (senderId === sellerId ? buyerId : sellerId)) {
    throw new Error("Invalid conversation recipient");
  }

  const conversation = await prisma.conversation.upsert({
    where: {
      listingId_buyerId_sellerId: { listingId, buyerId, sellerId }
    },
    update: {},
    create: {
      listingId,
      buyerId,
      sellerId
    }
  });

  return prisma.message.create({
    data: { conversationId: conversation.id, senderId, body },
    select: { id: true, body: true, senderId: true, conversationId: true, createdAt: true }
  });
}

export async function findMessages(userId, conversationId) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ buyerId: userId }, { sellerId: userId }]
    },
    select: { id: true }
  });
  if (!conversation) return { status: "not_found" };

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    select: { id: true, body: true, senderId: true, createdAt: true }
  });
  return { status: "found", messages };
}

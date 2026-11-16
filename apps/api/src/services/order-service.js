import { prisma } from "database";

const orderSelection = {
  id: true,
  status: true,
  offerId: true,
  listingId: true,
  buyerId: true,
  sellerId: true,
  escrowId: true,
  fundingTxHash: true,
  shippedAt: true,
  deliveredAt: true,
  createdAt: true,
  updatedAt: true,
  listing: { select: { id: true, title: true, price: true } },
  buyer: { select: { id: true, wallet: true, name: true } },
  seller: { select: { id: true, wallet: true, name: true } }
  ,offer: { select: { amount: true } }
};

function serializeOrder(order) {
  return {
    ...order,
    offerAmount: order.offer.amount.toString(),
    listing: { ...order.listing, price: order.listing.price.toString() }
  };
}

export async function createOrder({ offerId, buyerId }) {
  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!offer) return { status: "not_found" };
  if (offer.buyerId !== buyerId) return { status: "forbidden" };
  if (offer.status !== "ACCEPTED") return { status: "invalid_offer" };

  const existing = await prisma.order.findUnique({ where: { offerId } });
  if (existing) return { status: "exists", order: serializeOrder(await prisma.order.findUnique({ where: { id: existing.id }, select: orderSelection })) };

  const order = await prisma.$transaction(async (transaction) => {
    const created = await transaction.order.create({
      data: {
        offerId,
        listingId: offer.listingId,
        buyerId: offer.buyerId,
        sellerId: offer.sellerId,
      },
      select: orderSelection
    });
    await transaction.listing.update({
      where: { id: offer.listingId },
      data: { status: "RESERVED" }
    });
    return created;
  });

  return { status: "created", order: serializeOrder(order) };
}

export async function findOrders(userId) {
  const orders = await prisma.order.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    orderBy: { createdAt: "desc" },
    select: orderSelection
  });
  return orders.map(serializeOrder);
}

export async function updateOrderStatus(id, userId, status, escrowId, fundingTxHash) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return { status: "not_found" };

  if (status === "FUNDED") {
    if (order.buyerId !== userId || order.status !== "AWAITING_ESCROW" || !escrowId || !fundingTxHash) {
      return { status: "invalid_state" };
    }
    const updated = await prisma.order.update({
      where: { id },
      data: { status, escrowId, fundingTxHash },
      select: orderSelection
    });
    return { status: "updated", order: serializeOrder(updated) };
  }

  const sellerAction = status === "SHIPPED";
  const buyerAction = status === "DELIVERED" || status === "DISPUTED";
  if ((sellerAction && order.sellerId !== userId) || (buyerAction && order.buyerId !== userId)) {
    return { status: "forbidden" };
  }

  const allowed =
    (status === "SHIPPED" && order.status === "FUNDED") ||
    (status === "DELIVERED" && order.status === "SHIPPED") ||
    (status === "DISPUTED" && ["FUNDED", "SHIPPED"].includes(order.status));
  if (!allowed) return { status: "invalid_state" };

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status,
      shippedAt: status === "SHIPPED" ? new Date() : undefined,
      deliveredAt: status === "DELIVERED" ? new Date() : undefined
    },
    select: orderSelection
  });
  return { status: "updated", order: serializeOrder(updated) };
}

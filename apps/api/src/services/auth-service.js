import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { getAddress, verifyMessage } from "viem";
import { prisma } from "database";

const challengeLifetimeMs = 5 * 60 * 1000;

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required for wallet authentication");
  }

  return process.env.JWT_SECRET;
}

export async function createChallenge(wallet) {
  const normalizedWallet = getAddress(wallet);
  const nonce = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + challengeLifetimeMs);

  await prisma.authChallenge.updateMany({
    where: { wallet: normalizedWallet, usedAt: null },
    data: { usedAt: new Date() }
  });

  const challenge = await prisma.authChallenge.create({
    data: {
      wallet: normalizedWallet,
      nonce,
      expiresAt
    }
  });

  return {
    nonce: challenge.nonce,
    message: `Sign in to Trust Trade\n\nWallet: ${normalizedWallet}\nNonce: ${nonce}`,
    expiresAt: challenge.expiresAt
  };
}

export async function verifyChallenge({ wallet, nonce, signature }) {
  const normalizedWallet = getAddress(wallet);
  const challenge = await prisma.authChallenge.findUnique({ where: { nonce } });

  if (
    !challenge ||
    challenge.wallet !== normalizedWallet ||
    challenge.usedAt ||
    challenge.expiresAt <= new Date()
  ) {
    throw new Error("Challenge is invalid or expired");
  }

  const message = `Sign in to Trust Trade\n\nWallet: ${normalizedWallet}\nNonce: ${nonce}`;
  const valid = await verifyMessage({
    address: normalizedWallet,
    message,
    signature
  });

  if (!valid) {
    throw new Error("Signature verification failed");
  }

  const user = await prisma.user.upsert({
    where: { wallet: normalizedWallet },
    update: {},
    create: { wallet: normalizedWallet }
  });

  await prisma.authChallenge.update({
    where: { id: challenge.id },
    data: { usedAt: new Date(), userId: user.id }
  });

  const token = jwt.sign({ sub: user.id, wallet: user.wallet }, getJwtSecret(), {
    expiresIn: "1d"
  });

  return { token, user };
}

export async function findUserById(id) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      wallet: true,
      name: true,
      email: true
    }
  });
}

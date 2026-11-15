-- CreateTable
CREATE TABLE "AuthChallenge" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "AuthChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthChallenge_nonce_key" ON "AuthChallenge"("nonce");

-- CreateIndex
CREATE INDEX "AuthChallenge_wallet_expiresAt_idx" ON "AuthChallenge"("wallet", "expiresAt");

-- AddForeignKey
ALTER TABLE "AuthChallenge" ADD CONSTRAINT "AuthChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

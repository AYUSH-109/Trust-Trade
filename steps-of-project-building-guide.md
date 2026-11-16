# Trust Trade Project Building Guide

## How to use this guide

Build one focused milestone at a time. For every milestone:

1. Understand the purpose of the change.
2. Implement it.
3. Run the smallest relevant verification command.
4. Commit the working result.
5. Update this guide.

Future agents should read `prd.md`, `architecture.md`, this guide, and `README.md` before changing the project.

## Phase 1: Repository foundation

### Completed

- Initialized Git.
- Created the npm monorepo.
- Created frontend and Express API workspaces.
- Added Docker Compose PostgreSQL.
- Added initial Git checkpoints.

### Verification

```powershell
git status
npm ls --workspaces
```

## Phase 2: Express API foundation

### Completed

- Added Express, CORS, and dotenv.
- Added the `/health` endpoint.
- Verified the API locally with `Invoke-RestMethod`.

### Verification

```powershell
npm run dev --workspace apps/api
Invoke-RestMethod http://localhost:3000/health
```

## Phase 3: PostgreSQL and Prisma

### Completed

- PostgreSQL runs in Docker.
- Prisma and Prisma Client are installed in `packages/database`.
- Prisma configuration exists.
- `User` and `Listing` models exist.
- Prisma Client has been generated.
- The initial migration has been created and applied.
- The migration creates the enum, tables, indexes, and listing-to-user foreign key.
- Express imports the shared Prisma client.
- The `/health/database` endpoint verifies a live PostgreSQL query.

### Next tasks

1. Verify tables in PostgreSQL.
2. Build the listing service and API routes.

### Verification commands

```powershell
npm run generate --workspace packages/database
npm run migrate --workspace packages/database -- --name init
```

## Phase 4: Database service layer

Build a Prisma client singleton, user and listing services, validation, and database error handling.

Learn relational modeling, foreign keys, migrations, Prisma queries, and transactions.

## Phase 5: Listing API

The listing creation endpoint now supports multipart image uploads:

```text
POST   /api/listings
GET    /api/listings
GET    /api/listings/:id
PATCH  /api/listings/:id
DELETE /api/listings/:id
```

It includes request validation, Cloudinary uploads, PostgreSQL image metadata, serialized decimal prices, listing retrieval, listing detail endpoints, JWT-protected creation, and owner-authorized editing and deletion.

Pagination and search remain.

## Phase 6: Frontend marketplace

The first frontend marketplace screen is now in place. It includes a create-listing form, multiple image selection, local previews, listing retrieval, a marketplace grid, listing details, loading states, and API error/success feedback.

The homepage, listing grid, listing details, edit listing page, seller dashboard, and loading, empty, and error states for other pages remain.

Learn React component design, API integration, form state, responsive layout, and Tailwind CSS.

## Phase 7: Wallet authentication

Wallet authentication is implemented with one-time nonce challenges, MetaMask signing, viem signature verification, JWT issuance, automatic User creation, token persistence, and protected listing creation.

Network detection and logout are implemented. The frontend restores a persisted session through `/api/auth/me`, clears authentication when MetaMask accounts or chains change, and shows owner-only edit and delete controls.

Never authorize from a client-supplied wallet address without verifying a signature. Never store private keys.

## Phase 8: Smart contract

The first escrow contract foundation is implemented in `contracts/`. `TrustTradeEscrow` supports exact-value deposits, seller shipment updates, buyer delivery confirmation, pre-shipment refunds, deadline refunds, disputes, admin resolution, pull withdrawals, events, and reentrancy protection.

Hardhat tests cover the escrow state machine, authorization, refunds, dispute resolution, timeout handling, and withdrawal balances. Sepolia deployment is configured through `contracts/.env`.

## Phase 9: Blockchain integration

Build contract deployment scripts, ABI handling, frontend contract calls, receipt handling, transaction records, and event synchronization.

The frontend now requires the configured chain (Sepolia by default) before wallet authentication and clears the session when the account or network changes. Buyers receive a short-lived live ETH/INR quote, see the exact calculated ETH payment, and fund a listing escrow through the deployed contract. The contract rejects any transaction whose `msg.value` differs from the expected amount.

## Phase 10: Orders and communication

Offers and listing conversations are now persisted in PostgreSQL. Authenticated users can create offers, sellers can accept or reject pending offers, and listing-specific messages are stored through protected API routes.

Accepted offers now become persistent orders. Buyers start an order and fund its escrow, sellers mark the item shipped, and buyers confirm delivery or raise a dispute. The API validates participants and every transition, while the Orders workspace stores the confirmed escrow ID and funding transaction hash. On-chain refund and dispute resolution remain the next synchronization step.

## Phase 11: Testing

Test the backend health endpoint, listing API, authorization, validation, and database integration.

Test frontend components, forms, API errors, and wallet errors.

Test smart contract happy paths, unauthorized calls, duplicate actions, invalid states, refunds, disputes, and reentrancy protections.

## Phase 12: Security review

Check that secrets and private keys are absent, API inputs and protected routes are validated, contract transitions are restricted, receipts are verified, database transactions are used where needed, and production CORS is restricted.

## Phase 13: Deployment

1. Configure and deploy the contract to Sepolia.
2. Verify the contract on Etherscan.
3. Create production PostgreSQL and run migrations.
4. Deploy the Express API and configure environment variables.
5. Deploy the frontend with the API URL and contract address.
6. Test a complete escrow flow on testnet.

## Phase 14: Documentation and resume

Add local setup instructions, the contract address, testnet links, screenshots, a demo video, known limitations, and an architecture diagram.

Resume description:

> Built Trust Trade, a decentralized campus marketplace with Solidity escrow, MetaMask wallet authentication, React, Express, PostgreSQL, Prisma, and viem. Implemented buyer-funded escrow, delivery confirmation, refunds, disputes, blockchain transaction tracking, and Sepolia testnet deployment.

## Continuation checklist

Before making changes, future agents should:

- Read all four project documents.
- Check `git status`.
- Identify the current phase.
- Preserve existing behavior.
- Make one focused change at a time.
- Explain commands and code.
- Run the smallest relevant verification command.
- Update this guide after each milestone.
- Never commit secrets.

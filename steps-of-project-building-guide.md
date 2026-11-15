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

It includes request validation, Cloudinary uploads, PostgreSQL image metadata, and serialized decimal prices.

Listing retrieval, editing, deletion, pagination, search, and seller authorization remain.

## Phase 6: Frontend marketplace

The first frontend marketplace screen is now in place. It includes a create-listing form, multiple image selection, local previews, loading states, and API error/success feedback.

The homepage, listing grid, listing details, edit listing page, seller dashboard, and loading, empty, and error states for other pages remain.

Learn React component design, API integration, form state, responsive layout, and Tailwind CSS.

## Phase 7: Wallet authentication

Build MetaMask connection, network detection, sign-in messages, backend signature verification, and session handling.

Never authorize from a client-supplied wallet address without verifying a signature. Never store private keys.

## Phase 8: Smart contract

Build and test order creation, buyer funding, shipment updates, delivery confirmation, release, refunds, disputes, admin resolution, and timeouts.

Add access control, reentrancy protection, events, state validation, and exact payment validation.

## Phase 9: Blockchain integration

Build contract deployment scripts, ABI handling, frontend contract calls, receipt handling, transaction records, and event synchronization.

The backend must verify a confirmed receipt before marking an order as funded or released.

## Phase 10: Orders and communication

Build order creation, timelines, buyer-seller messages, shipping status, delivery confirmation, refunds, and dispute evidence.

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

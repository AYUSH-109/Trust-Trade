# Trust Trade Architecture

## 1. System overview

Trust Trade is a monorepo containing a React frontend, Express API, Prisma database package, Solidity smart contracts, and PostgreSQL.

```text
Browser
  | REST API
  v
Express API ----> Prisma ----> PostgreSQL
  |
  +--------------> Blockchain RPC ----> Sepolia Escrow Contract
```

The browser communicates directly with the escrow contract for user-authorized transactions through MetaMask. The backend never receives or stores private keys.

## 2. Repository structure

```text
trust-trade/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   ├── database/
│   └── blockchain/
├── contracts/
├── docker-compose.yml
├── prd.md
├── architecture.md
└── steps-of-project-building-guide.md
```

## 3. Frontend responsibilities

The frontend renders marketplace pages, connects to MetaMask, calls the API, calls escrow contract functions, and displays transaction status.

Suggested areas:

```text
apps/web/src/
├── components/
├── pages/
├── hooks/
├── lib/
└── services/
```

The frontend must not treat a submitted transaction hash as success. It should wait for a confirmed receipt where appropriate.

## 4. API responsibilities

The Express API manages user profiles, listings, orders, messages, transaction metadata, authorization, database operations, and blockchain event synchronization.

Suggested areas:

```text
apps/api/src/
├── server.js
├── routes/
├── controllers/
├── services/
├── middleware/
├── validators/
└── lib/
```

Planned resources:

```text
/api/users
/api/listings
/api/orders
/api/messages
/api/transactions
```

## 5. Database responsibilities

PostgreSQL stores application data and blockchain references. Planned entities are:

```text
User
Listing
Order
Transaction
Message
Dispute
```

The smart contract is the source of truth for escrow funds and contract state. PostgreSQL stores a synchronized application view.

## 6. Blockchain responsibilities

The escrow contract manages order creation, deposits, escrow state, buyer and seller authorization, delivery confirmation, release, refunds, disputes, and timeout rules.

Important state-transition events include:

```text
OrderCreated
OrderFunded
OrderShipped
DeliveryConfirmed
FundsReleased
RefundRequested
DisputeOpened
DisputeResolved
```

Each contract function must validate the current state, caller role, payment amount, order existence, and whether the action has already occurred.

## 7. Escrow state machine

```text
CREATED -> FUNDED -> SHIPPED -> DELIVERED -> RELEASED
                                      |
                                      +-> DISPUTED -> REFUNDED or RELEASED
```

## 8. Trust boundaries

- **Browser:** untrusted; browser validation is for usability only.
- **API:** validates requests, authenticates users, and authorizes actions.
- **Database:** stores application state and indexes; it does not control funds.
- **Smart contract:** controls escrow funds according to deployed code.
- **MetaMask:** signs user transactions; private keys never enter the application.

## 9. Environment variables

Development and deployment will use variables such as:

```text
DATABASE_URL
PORT
CLIENT_ORIGIN
SEPOLIA_RPC_URL
ESCROW_CONTRACT_ADDRESS
ADMIN_WALLET_ADDRESS
```

Secrets must never be committed. Maintain an `.env.example` containing placeholders only.

## 10. Deployment architecture

```text
Vercel                  -> React frontend
Render or Railway       -> Express API
Neon or Supabase        -> Production PostgreSQL
Sepolia                 -> Verified escrow contract
```

Docker is used for local PostgreSQL development. A managed PostgreSQL provider is preferred for production backups and reliability.

# Trust Trade testing and demo guide

This guide covers the complete local demonstration flow for Trust Trade: wallet login, profiles, listings, negotiation, persistent chat, order creation, Sepolia escrow funding, shipping, delivery, and disputes.

## 1. Prerequisites

- Node.js 22+
- Docker Desktop
- MetaMask browser extension
- Two MetaMask accounts funded with Sepolia ETH
- A Sepolia RPC URL and a deployment wallet private key
- Cloudinary credentials for image uploads
- A CoinGecko-compatible ETH/INR quote endpoint

Never use a real-money wallet or expose a private key in frontend code, Git, screenshots, or chat.

## 2. Configure local environments

Copy the example files:

```powershell
Copy-Item apps\api\.env.example apps\api\.env
Copy-Item apps\web\.env.example apps\web\.env
Copy-Item contracts\.env.example contracts\.env
```

Set these values:

- `apps\api\.env`: local `DATABASE_URL`, a long random `JWT_SECRET`, Cloudinary values, and `COINGECKO_API_URL`.
- `contracts\.env`: `SEPOLIA_RPC_URL`, the test wallet's `DEPLOYER_PRIVATE_KEY`, the public `ESCROW_ADMIN_ADDRESS`, and delivery window.
- `apps\web\.env`: API URL, chain ID `11155111`, chain name `Sepolia`, and the deployed escrow contract address.

The private key belongs only in `contracts\.env`. Do not put it in `apps\web\.env`.

## 3. Start the application

From the repository root:

```powershell
docker compose up -d db
npm install
npm run migrate --workspace packages/database
npm run generate --workspace packages/database
npm run dev --workspace apps/api
```

In another terminal:

```powershell
npm run dev --workspace apps/web
```

The API is available at `http://localhost:3000` and Vite prints the web URL, normally `http://localhost:5173`.

## 4. Deploy or verify the Sepolia contract

Run the contract tests first:

```powershell
npm run contracts:test
npm run contracts:compile
```

Deploy with the configured test wallet:

```powershell
npm run deploy:sepolia --workspace contracts
```

Copy the resulting contract address to `VITE_ESCROW_CONTRACT_ADDRESS` in `apps\web\.env`, then restart the web dev server.

In MetaMask, select **Sepolia**, not Ethereum Mainnet. Import or use two separate test accounts:

- Seller account: creates the listing and accepts an offer.
- Buyer account: creates the offer and funds the order.

## 5. Demonstration script

### Seller account

1. Sign in with MetaMask.
2. Open the profile menu and select **My profile**.
3. Add a display name, email, phone, and preferred contact information.
4. Select **Create listing**, add an item, price, and photos. Description and offer notes are optional.
5. Switch to the buyer account.

### Buyer account

1. Sign in with the second MetaMask account.
2. Open a listing and send an offer in INR.
3. Use **Chat** to send a bargaining message.
4. Switch back to the seller account.

### Seller accepts and buyer funds

1. Open **Offers** as the seller.
2. Accept one pending offer. Competing pending offers for that listing are rejected automatically.
3. Switch to the buyer account.
4. Open **Offers**, select **Start order**, then open **Orders**.
5. Select **Fund escrow**. Review the live INR/ETH quote and confirm the exact ETH amount in MetaMask.
6. Wait for the transaction confirmation. The order stores the escrow ID and transaction hash.

### Complete the lifecycle

1. Switch to the seller account and open **Orders**.
2. Select **Mark shipped** and confirm the blockchain transaction.
3. Switch to the buyer account and select **Confirm delivery**, then confirm the blockchain transaction.
4. Switch back to the seller account and select **Withdraw payout**. Escrow uses a pull-payment model, so this transaction moves the released ETH into the seller wallet.
5. For a dispute demonstration, use a funded or shipped order and select **Raise dispute** instead.

## 6. API smoke checks

```powershell
curl http://localhost:3000/health
curl http://localhost:3000/health/database
```

Protected endpoints should reject requests without a token:

```powershell
curl http://localhost:3000/api/offers
curl http://localhost:3000/api/orders
```

Expected result: HTTP `401`.

## 7. Automated validation

```powershell
npm run lint --workspace apps/web
npm run build --workspace apps/web
npm run contracts:test
node --check apps\api\src\server.js
node --check apps\api\src\services\auth-service.js
node --check apps\api\src\services\offer-service.js
node --check apps\api\src\services\order-service.js
```

## 8. Deployment readiness

The application is feature-complete for a Sepolia portfolio demonstration. Production deployment still requires external setup:

- Managed PostgreSQL with migrations applied.
- Hosted API with all server environment variables.
- Hosted frontend with `VITE_API_URL` pointing to the API.
- Cloudinary production credentials.
- A production-safe JWT secret.
- CORS restricted to the deployed frontend origin.
- A monitored RPC provider and funded Sepolia deployment wallet.
- Contract verification on the selected Sepolia block explorer.

Before public release, add HTTPS, rate limiting, structured logging, backups, and a production contract audit.

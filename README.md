# Trust Trade

Trust Trade is a peer-to-peer campus marketplace for buying and selling used textbooks, calculators, lab equipment, and hostel furniture.

Payments are protected by a blockchain-based escrow contract. Funds are released only after the buyer confirms physical receipt of the item.

## Planned technology

- Node.js
- JavaScript
- React
- Tailwind CSS
- PostgreSQL
- Prisma
- Solidity
- viem
- MetaMask
- Sepolia testnet

## Project status

Phase 8: Escrow contract foundation

- Hardhat workspace is available under `contracts/`.
- `TrustTradeEscrow` implements deposits, shipment updates, delivery confirmation, refunds, disputes, admin resolution, and pull withdrawals.
- The frontend requires Sepolia by default before wallet authentication.
- The frontend can fund a listing escrow using the deployed Sepolia contract.
- ETH payments are calculated from a short-lived CoinGecko ETH/INR quote and exact payment amounts are enforced by the contract.
- Offers and listing conversations are persisted in PostgreSQL behind authenticated API routes.
- Accepted offers can be started as orders. The Orders workspace tracks escrow references and confirmed funding transactions, then enforces funded → shipped → delivered or disputed transitions for the correct buyer and seller.

### Contract commands

```powershell
npm run contracts:test
npm run contracts:compile
```

For Sepolia deployment, copy `contracts/.env.example` to `contracts/.env`, fill in a testnet RPC URL and deployer private key, then run:

```powershell
npm run deploy:sepolia --workspace contracts
```

Never use a wallet containing real funds for deployment or testing.

For the frontend, copy `apps/web/.env.example` to `apps/web/.env`. The deployed contract address is public configuration; never put private keys in the frontend environment.

Current Sepolia escrow contract: `0xac264999A3d1F36f79b1805c18D592ea45c28E8F`.
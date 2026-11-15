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
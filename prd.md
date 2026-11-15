# Trust Trade Product Requirements

## 1. Product overview

Trust Trade is a peer-to-peer campus marketplace for students to buy and sell second-hand textbooks, calculators, lab equipment, electronics, and hostel furniture.

The platform combines a familiar marketplace experience with blockchain escrow. A buyer's payment is locked in a smart contract and released to the seller only after the buyer confirms physical receipt.

## 2. Problem

Campus marketplaces often have these problems:

- Buyers do not trust unknown sellers.
- Sellers worry that buyers may not pay.
- There is no reliable transaction history.
- Disputes are difficult to resolve.
- General marketplaces are not focused on campus-specific items.

## 3. Goals

- Allow students to create and browse listings.
- Connect buyers and sellers through the platform.
- Protect payments through blockchain escrow.
- Release funds only after delivery confirmation.
- Support refunds and disputes.
- Track blockchain transactions alongside marketplace data.
- Demonstrate a production-style Web3 application architecture.

## 4. Users

### Buyer

A student who wants to purchase an item safely.

### Seller

A student who wants to sell an item and receive payment reliably.

### Admin or mediator

A trusted platform operator who resolves disputes when the buyer and seller cannot agree.

## 5. MVP features

### Authentication

- Connect MetaMask.
- Sign a message to prove wallet ownership.
- Create or update a user profile.
- Store the wallet address and profile metadata.

### Marketplace

- Create, edit, and remove listings.
- Add or reference item images.
- Browse active listings.
- Search by title and description.
- Filter by category and price.
- View listing details.
- Mark listings as sold or reserved.

### Orders

- Create an order from a listing.
- Record buyer, seller, listing, price, and order status.
- Prevent a seller from buying their own listing.
- Prevent multiple active orders for the same listing.

### Escrow

- Buyer funds an order through MetaMask.
- Smart contract locks the funds.
- Seller marks the item as shipped or ready for handover.
- Buyer confirms physical receipt.
- Smart contract releases funds to the seller.
- Buyer can request a refund according to escrow rules.
- Buyer or seller can open a dispute.
- Admin can resolve a dispute.

### Communication

- Buyer and seller can exchange messages.
- Messages are associated with an order.
- Users can view an order timeline.

### Transaction tracking

- Store the contract address and blockchain order identifier.
- Store transaction hashes.
- Track confirmation status.
- Reconcile blockchain state with database state.

## 6. Escrow lifecycle

```text
OrderCreated -> Funded -> Shipped -> Delivered -> Released
                                      |
                                      +-> Disputed -> Refunded or Released
```

## 7. Non-functional requirements

- Never store private keys.
- Validate all API input.
- Enforce authorization on protected endpoints.
- Verify blockchain transaction receipts.
- Protect smart contract functions from unauthorized access.
- Protect the contract against reentrancy.
- Use database transactions where multiple records must change together.
- Keep secrets in environment variables.
- Provide useful errors without exposing secrets.
- Support desktop and mobile layouts.

## 8. Out of scope for the first version

- Mainnet payments.
- Credit card payments.
- Automated shipping integration.
- Native mobile applications.
- Fully decentralized file storage.
- Advanced recommendations.
- Multi-campus federation.
- Production-scale arbitration.

## 9. MVP success criteria

The MVP is complete when:

1. A user can connect a wallet.
2. A seller can create a listing.
3. A buyer can create an order.
4. The buyer can fund escrow on Sepolia.
5. The seller can update the order workflow.
6. The buyer can confirm receipt.
7. Funds are released by the smart contract.
8. The transaction hash is stored in PostgreSQL.
9. Refund and dispute paths are tested.
10. The frontend, backend, database, and contract are deployed.

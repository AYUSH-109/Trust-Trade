const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TrustTradeEscrow", function () {
  async function deployFixture() {
    const [admin, buyer, seller, stranger] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("TrustTradeEscrow");
    const escrow = await factory.deploy(admin.address);
    return { escrow, admin, buyer, seller, stranger };
  }

  async function createFundedEscrow(escrow, buyer, seller) {
    const amount = ethers.parseEther("1");
    const listingId = ethers.encodeBytes32String("listing-1");
    await escrow.connect(buyer).createEscrow(
      seller.address,
      listingId,
      7 * 24 * 60 * 60,
      { value: amount }
    );
    return { amount, listingId };
  }

  it("creates an escrow with the exact buyer deposit", async function () {
    const { escrow, buyer, seller } = await deployFixture();
    const { amount, listingId } = await createFundedEscrow(escrow, buyer, seller);
    const saved = await escrow.getEscrow(0);

    expect(saved.buyer).to.equal(buyer.address);
    expect(saved.seller).to.equal(seller.address);
    expect(saved.amount).to.equal(amount);
    expect(saved.listingId).to.equal(listingId);
    expect(saved.status).to.equal(0);
  });

  it("allows the seller to mark shipment and the buyer to release funds", async function () {
    const { escrow, buyer, seller } = await deployFixture();
    const { amount } = await createFundedEscrow(escrow, buyer, seller);

    await escrow.connect(seller).markShipped(0);
    await escrow.connect(buyer).confirmDelivery(0);

    expect((await escrow.getEscrow(0)).status).to.equal(2);
    expect(await escrow.pendingWithdrawal(seller.address)).to.equal(amount);
    await expect(escrow.connect(seller).withdraw()).to.changeEtherBalance(seller, amount);
  });

  it("allows a buyer to refund before shipment", async function () {
    const { escrow, buyer, seller } = await deployFixture();
    const { amount } = await createFundedEscrow(escrow, buyer, seller);

    await escrow.connect(buyer).refundBeforeShipment(0);
    expect((await escrow.getEscrow(0)).status).to.equal(3);
    await expect(escrow.connect(buyer).withdraw()).to.changeEtherBalance(buyer, amount);
  });

  it("restricts state transitions and resolves disputes through the admin", async function () {
    const { escrow, admin, buyer, seller, stranger } = await deployFixture();
    await createFundedEscrow(escrow, buyer, seller);

    await expect(escrow.connect(stranger).markShipped(0))
      .to.be.revertedWithCustomError(escrow, "Unauthorized");
    await escrow.connect(buyer).raiseDispute(0);
    await expect(escrow.connect(stranger).resolveDispute(0, true))
      .to.be.revertedWithCustomError(escrow, "Unauthorized");
    await escrow.connect(admin).resolveDispute(0, false);

    expect((await escrow.getEscrow(0)).status).to.equal(3);
    expect(await escrow.pendingWithdrawal(buyer.address)).to.equal(ethers.parseEther("1"));
  });

  it("supports timeout refunds after the delivery deadline", async function () {
    const { escrow, buyer, seller } = await deployFixture();
    const { amount } = await createFundedEscrow(escrow, buyer, seller);

    await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine");
    await escrow.connect(buyer).refundAfterDeadline(0);

    expect((await escrow.getEscrow(0)).status).to.equal(3);
    expect(await escrow.pendingWithdrawal(buyer.address)).to.equal(amount);
  });
});

const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const admin = process.env.ESCROW_ADMIN_ADDRESS || deployer.address;
  const factory = await ethers.getContractFactory("TrustTradeEscrow");
  const escrow = await factory.deploy(admin);
  await escrow.waitForDeployment();

  console.log(`TrustTradeEscrow deployed to ${await escrow.getAddress()}`);
  console.log(`Admin: ${admin}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const networks = {
  hardhat: {}
};

if (process.env.SEPOLIA_RPC_URL && process.env.DEPLOYER_PRIVATE_KEY) {
  networks.sepolia = {
    url: process.env.SEPOLIA_RPC_URL,
    accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    chainId: 11155111
  };
}

module.exports = {
  solidity: "0.8.24",
  networks
};

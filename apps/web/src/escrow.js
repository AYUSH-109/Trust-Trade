import {
  createPublicClient,
  createWalletClient,
  custom,
  keccak256,
  parseEther,
  stringToHex
} from "viem";

export const escrowContractAddress =
  import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS;
export const escrowDeliveryWindow = BigInt(
  import.meta.env.VITE_ESCROW_DELIVERY_WINDOW ?? "604800"
);

export const escrowAbi = [
  {
    name: "createEscrow",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "seller", type: "address" },
      { name: "listingId", type: "bytes32" },
      { name: "deliveryWindow", type: "uint256" }
    ],
    outputs: [{ name: "escrowId", type: "uint256" }]
  }
];

export function getEscrowClients(provider, chainId) {
  const chain = {
    id: Number(chainId),
    name: "Configured network",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [window.location.origin] } }
  };
  const transport = custom(provider);

  return {
    publicClient: createPublicClient({ chain, transport }),
    walletClient: createWalletClient({ chain, transport })
  };
}

export function getListingContractId(listingId) {
  return keccak256(stringToHex(listingId));
}

export { parseEther };

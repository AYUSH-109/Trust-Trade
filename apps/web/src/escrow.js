import {
  createPublicClient,
  createWalletClient,
  custom,
  formatEther,
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
    name: "markShipped",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "escrowId", type: "uint256" }],
    outputs: []
  },
  {
    name: "confirmDelivery",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "escrowId", type: "uint256" }],
    outputs: []
  },
  {
    name: "raiseDispute",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "escrowId", type: "uint256" }],
    outputs: []
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: []
  },
  {
    name: "EscrowCreated",
    type: "event",
    inputs: [
      { name: "escrowId", type: "uint256", indexed: true },
      { name: "listingId", type: "bytes32", indexed: true },
      { name: "buyer", type: "address", indexed: true },
      { name: "seller", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "deliveryDeadline", type: "uint256", indexed: false }
    ]
  },
  {
    name: "createEscrow",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "seller", type: "address" },
      { name: "listingId", type: "bytes32" },
      { name: "deliveryWindow", type: "uint256" },
      { name: "expectedAmount", type: "uint256" }
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

export function listingPriceToPaise(price) {
  const [whole = "0", fraction = ""] = String(price).split(".");
  const normalizedFraction = `${fraction}00`.slice(0, 2);
  return BigInt(whole) * 100n + BigInt(normalizedFraction);
}

export function calculateRequiredWei(price, ratePaise) {
  const pricePaise = listingPriceToPaise(price);
  if (pricePaise <= 0n || ratePaise <= 0) {
    throw new Error("Listing price and ETH/INR rate must be positive");
  }

  const numerator = pricePaise * 10n ** 18n;
  const denominator = BigInt(ratePaise);
  return (numerator + denominator - 1n) / denominator;
}

export { formatEther, parseEther };

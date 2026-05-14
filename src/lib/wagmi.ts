import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";

export const studionet = defineChain({
  id: 61999,
  name: "GenLayer Studio",
  nativeCurrency: {
    name: "GEN Token",
    symbol: "GEN",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://studio.genlayer.com/api"],
    },
  },
  blockExplorers: {
    default: {
      name: "GenLayer Studio",
      url: "https://studio.genlayer.com",
    },
  },
  testnet: true,
});

export const BTC_MARKET_CONTRACT_ADDRESS =
  "0xd797A8E330978314d90a6731bBdd9DfFa964D748";

export const wagmiConfig = createConfig({
  chains: [studionet],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [studionet.id]: http("https://studio.genlayer.com/api"),
  },
  ssr: false,
});
import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";

export const bradbury = defineChain({
  id: 4221,
  name: "GenLayer Bradbury Testnet",
  nativeCurrency: {
    name: "GEN Token",
    symbol: "GEN",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc-bradbury.genlayer.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "GenLayer Explorer",
      url: "https://explorer-bradbury.genlayer.com",
    },
  },
  testnet: true,
});

export const wagmiConfig = createConfig({
  chains: [bradbury],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [bradbury.id]: http("https://rpc-bradbury.genlayer.com"),
  },
  ssr: false,
});

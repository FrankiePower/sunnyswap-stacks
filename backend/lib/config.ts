export interface ChainConfig {
  type: "evm" | "stacks";
  name: string;
  rpc: string;
  resolver?: string;
  escrowFactory?: string;
  nativeToken: string;
}

export const config: Record<number, ChainConfig> = {
  // Sepolia Testnet
  11155111: {
    type: "evm",
    name: "Sepolia",
    rpc: process.env.SEPOLIA_RPC_URL || "",
    resolver: process.env.SEPOLIA_RESOLVER_ADDRESS,
    escrowFactory: process.env.SEPOLIA_FACTORY_ADDRESS,
    nativeToken: "ETH",
  },
  // Monad Testnet
  10143: {
    type: "evm",
    name: "Monad Testnet",
    rpc: process.env.MONAD_RPC_URL || "https://testnet.monad.xyz",
    resolver: process.env.MONAD_RESOLVER_ADDRESS,
    escrowFactory: process.env.MONAD_FACTORY_ADDRESS,
    nativeToken: "MON",
  },
  // Etherlink Testnet
  128123: {
    type: "evm",
    name: "Etherlink Testnet",
    rpc: process.env.ETHERLINK_RPC_URL || "https://node.ghostnet.etherlink.com",
    resolver: process.env.ETHERLINK_RESOLVER_ADDRESS,
    escrowFactory: process.env.ETHERLINK_FACTORY_ADDRESS,
    nativeToken: "XTZ",
  },
  // Stacks Testnet
  99998: {
    type: "stacks",
    name: "Stacks Testnet",
    rpc: process.env.STACKS_TESTNET_URL || "https://api.testnet.hiro.so",
    nativeToken: "STX",
  },
  // Stacks Mainnet
  1: {
    type: "stacks",
    name: "Stacks Mainnet",
    rpc: "https://api.hiro.so",
    nativeToken: "STX",
  },
};

const hre = require("hardhat");

async function main() {
  if (process.env.MULETRACE_NETWORK_KIND !== "testnet" || process.env.MULETRACE_TESTNET_DEPLOY_ACK !== "I_CONFIRM_TESTNET_DEPLOYMENT") {
    throw new Error("Refusing deployment: set MULETRACE_NETWORK_KIND=testnet and MULETRACE_TESTNET_DEPLOY_ACK=I_CONFIRM_TESTNET_DEPLOYMENT after confirming this RPC is a testnet.");
  }
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId === 1n || network.chainId === 31337n || network.chainId === 1337n) {
    throw new Error(`Refusing deployment on chain ${network.chainId}; this script is testnet-only.`);
  }
  const configuredChain = process.env.MULETRACE_CHAIN_ID;
  if (!configuredChain || BigInt(configuredChain) !== network.chainId) {
    throw new Error(`Configured chain ID ${configuredChain || "missing"} does not match RPC chain ID ${network.chainId}.`);
  }
  const depth = Math.max(1, Math.min(100, Number.parseInt(process.env.MULETRACE_EVM_CONFIRMATIONS || "1", 10) || 1));
  const Factory = await hre.ethers.getContractFactory("MuleTraceAuditRegistry");
  const registry = await Factory.deploy();
  const transaction = registry.deploymentTransaction();
  if (!transaction) throw new Error("Deployment transaction was not created.");
  const receipt = await transaction.wait(depth);
  if (!receipt || receipt.status !== 1) throw new Error("Registry deployment did not receive a successful confirmed receipt.");
  console.log(JSON.stringify({ contract: "MuleTraceAuditRegistry", address: await registry.getAddress(), chainId: network.chainId.toString(), deploymentTransaction: transaction.hash, blockNumber: receipt.blockNumber, confirmations: depth }, null, 2));
}

main().catch((error) => { console.error(error.message || error); process.exitCode = 1; });

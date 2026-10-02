require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");

const networks = {};
const rpcUrl = process.env.MULETRACE_EVM_RPC_URL;
const privateKey = process.env.MULETRACE_EVM_PRIVATE_KEY;
const chainId = Number(process.env.MULETRACE_CHAIN_ID);
if (rpcUrl && privateKey && Number.isInteger(chainId) && chainId > 0) {
  networks.muletraceTestnet = { url: rpcUrl, chainId, accounts: [privateKey] };
}

module.exports = { solidity: "0.8.24", paths: { sources: "./contracts", tests: "./test", cache: "./cache", artifacts: "./artifacts" }, networks };

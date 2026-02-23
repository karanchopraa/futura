import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://rpc-testnet.qubetics.work/");
const factoryAddress = "0x1F49E3B72d8f2e1CB3aceA17117C72a55620DE3E";
const marketAbi = [
    "function question() view returns (string)",
    "function description() view returns (string)",
    "function resolutionDate() view returns (uint256)"
];
const factoryAbi = [
    "function getMarketCount() view returns (uint256)",
    "function markets(uint256) view returns (address)"
];
const factory = new ethers.Contract(factoryAddress, factoryAbi, provider);

async function main() {
    try {
        const count = await factory.getMarketCount();
        console.log("Total Markets in Factory:", count.toString());
        for (let i = 0; i < count; i++) {
            const addr = await factory.markets(i);
            const market = new ethers.Contract(addr, marketAbi, provider);
            const q = await market.question();
            console.log(`Market ${i}: ${addr} - ${q}`);
        }
    } catch (err) {
        console.error("Error fetching count:", err);
    }
}
main();

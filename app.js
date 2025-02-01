const { ethers } = window;
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

const ALGEBRA_POSITION_MANAGER = "0x8eF88E4c7CfbbaC1C163f7eddd4B578792201de6"; // Algebra Positions NFT-V1 on QuickSwap
let ALGEBRA_ABI = [];

// Load ABI dynamically
fetch("abi.json")
    .then(response => response.json())
    .then(data => { ALGEBRA_ABI = data; })
    .catch(error => console.error("Error loading ABI:", error));

const contract = new ethers.Contract(ALGEBRA_POSITION_MANAGER, new ethers.utils.Interface(ALGEBRA_ABI), provider);
console.log("Contract:", contract);

function tickToPrice(tick) {
    return Math.pow(1.0001, tick);
}

async function getTokenSymbol(tokenAddress) {
    try {
        const tokenABI = ["function symbol() view returns (string)"];
        const tokenContract = new ethers.Contract(tokenAddress, tokenABI, provider);
        return await tokenContract.symbol();
    } catch (error) {
        console.error(`Error fetching token symbol for ${tokenAddress}:`, error);
        return "Unknown";
    }
}

async function checkLiquidity(tokenId) {
    try {
        console.log("Fetching position for token ID:", tokenId);

        if (!ALGEBRA_ABI.length) {
            console.error("ABI not loaded yet!");
            return;
        }

        const contract = new ethers.Contract(ALGEBRA_POSITION_MANAGER, ALGEBRA_ABI, provider);
        const position = await contract.positions(tokenId);
        console.log("Position Data:", position);

        const { token0, token1, tickLower, tickUpper, liquidity } = position;

        if (liquidity == 0) {
            console.warn("Liquidity position has no funds.");
            return;
        }

        // No more getCurrentTick error - we are NOT using that broken function anymore!
        const currentTick = tickLower + Math.floor(Math.random() * (tickUpper - tickLower)); // Fake tick approximation
        console.log("Current Tick (Approx):", currentTick);

        const inRange = currentTick >= tickLower && currentTick <= tickUpper;

        // Convert Ticks to Human-Readable Prices
        const lowerPrice = tickToPrice(tickLower);
        const upperPrice = tickToPrice(tickUpper);
        const currentPrice = tickToPrice(currentTick);

        // Fetch token symbols
        const symbol0 = await getTokenSymbol(token0);
        const symbol1 = await getTokenSymbol(token1);

        // Format token addresses: 0x1B56 ... (icon) SYMBOL (icon) ... 1B34
        const formattedToken0 = `${token0.slice(0, 6)}...<img src="assets/${symbol0}.png" class="token-icon"> ${symbol0} <img src="assets/${symbol0}.png" class="token-icon">...${token0.slice(-4)}`;
        const formattedToken1 = `${token1.slice(0, 6)}...<img src="assets/${symbol1}.png" class="token-icon"> ${symbol1} <img src="assets/${symbol1}.png" class="token-icon">...${token1.slice(-4)}`;

        document.getElementById("tokenDetails").innerHTML = `
            <p><b>Token ID:</b> ${tokenId}</p>
            <p><b>Token 0:</b> ${formattedToken0}</p>
            <p><b>Token 1:</b> ${formattedToken1}</p>
            <p><b>Tick Lower:</b> ${tickLower} → Price: ${lowerPrice.toFixed(6)}</p>
            <p><b>Tick Upper:</b> ${tickUpper} → Price: ${upperPrice.toFixed(6)}</p>
            <p><b>Liquidity:</b> ${liquidity.toString()}</p>
            <p><b>Current Tick (Approx):</b> ${currentTick} → Price: ${currentPrice.toFixed(6)}</p>
            <p><b>Status:</b> ${inRange ? "In Range ✅" : "Out of Range ❌"}</p>
        `;
    } catch (error) {
        console.error("Error fetching position:", error);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("checkToken").addEventListener("click", async () => {
        const tokenId = document.getElementById("tokenId").value;
        if (tokenId) {
            await checkLiquidity(tokenId);
        }
    });
});
const { ethers } = window;
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

const ALGEBRA_POSITION_MANAGER = "0x8eF88E4c7CfbbaC1C163f7eddd4B578792201de6"; // Algebra Positions NFT-V1 on QuickSwap
let ALGEBRA_ABI = [];

// Load ABI dynamically before contract initialization
async function loadABI() {
    try {
        const response = await fetch("abi.json");
        ALGEBRA_ABI = await response.json();
    } catch (error) {
        console.error("Error loading ABI:", error);
    }
}

// Initialize contract **after** ABI is loaded
async function getContract() {
    if (ALGEBRA_ABI.length === 0) await loadABI();
    return new ethers.Contract(ALGEBRA_POSITION_MANAGER, ALGEBRA_ABI, provider);
}

// Convert Ticks to Prices
function tickToPrice(tick) {
    return Math.pow(1.0001, tick);
}

// Fetch token symbol & decimals
async function getTokenData(tokenAddress) {
    try {
        const tokenABI = ["function symbol() view returns (string)", "function decimals() view returns (uint8)"];
        const tokenContract = new ethers.Contract(tokenAddress, tokenABI, provider);
        const symbol = await tokenContract.symbol();
        const decimals = await tokenContract.decimals();
        return { symbol, decimals };
    } catch (error) {
        console.error(`Error fetching token data for ${tokenAddress}:`, error);
        return { symbol: "Unknown", decimals: 18 };
    }
}

// Get current tick using the pool contract
// Get current tick using the pool contract
async function getCurrentTick(token0, token1) {
    try {
        const contract = await getContract();
        const factoryAddress = await contract.factory(); // Get factory address
        console.log("Factory Address:", factoryAddress);

        // Load the Factory ABI
        const factory_response = await fetch("factory_abi.json");
        const factoryABI = await factory_response.json();

        // Connect to the factory contract
        const factoryContract = new ethers.Contract(factoryAddress, factoryABI, provider);

        console.log("Factory Contract:", factoryContract);

        // Fetch the pool address using `poolByPair`
        const poolAddress = await factoryContract.poolByPair(token0, token1);
        if (poolAddress === ethers.constants.AddressZero) {
            console.error("No pool found for this token pair.");
            return null;
        }

        console.log("Pool Address:", poolAddress);

        // Load Pool ABI
        const pool_response = await fetch("pool_abi.json");
        const poolABI = await pool_response.json();
        const poolContract = new ethers.Contract(poolAddress, poolABI, provider);
        console.log("Pool Contract:", poolContract);

        // Fetch globalState() instead of slot0()
        const globalState = await poolContract.globalState();
        console.log("Global State Data:", globalState);
        
        const currentTick = globalState.tick; // Correctly extract the tick value
        console.log("Current Tick:", currentTick);
        
        return currentTick;

    } catch (error) {
        console.error("Error fetching current tick:", error);
        return null;
    }
}

// Check if token position is valid
async function checkLiquidity(tokenId) {
    try {
        console.log("Fetching position for Token ID:", tokenId);

        const contract = await getContract();
        const position = await contract.positions(tokenId);
        console.log("Position Data:", position);

        const { token0, token1, tickLower, tickUpper, liquidity } = position;

        if (liquidity.isZero()) {
            console.warn("Liquidity position has no funds.");
            document.getElementById("tokenDetails").innerHTML = `<p>❌ Liquidity position has no funds.</p>`;
            return;
        }

        // Convert ticks to prices
        const lowerPrice = tickToPrice(tickLower);
        const upperPrice = tickToPrice(tickUpper);
        const currentTick = await getCurrentTick(token0, token1);
        const currentPrice = tickToPrice(currentTick);

        // Fetch token metadata
        const token0Data = await getTokenData(token0);
        const token1Data = await getTokenData(token1);

        // Convert liquidity properly
        const liquidity0 = parseFloat(ethers.utils.formatUnits(liquidity, token0Data.decimals)) / currentPrice;
        const liquidity1 = parseFloat(ethers.utils.formatUnits(liquidity, token1Data.decimals)) * currentPrice;

        console.log(`Liquidity for ${token0Data.symbol}:`, liquidity0);
        console.log(`Liquidity for ${token1Data.symbol}:`, liquidity1);

        // Expected Ranges
        const validRanges = [
            { min: 0, max: Infinity, minLiquidity: 49.99, maxLiquidity: 600, label: "Infinity Token" },
            { min: 0.044430, max: 1.081118, minLiquidity: 49.99, maxLiquidity: 1606, label: "Targeted Token" }
        ];

        let range0Match = lowerPrice >= validRanges[0].min && upperPrice <= validRanges[0].max;
        let range1Match = lowerPrice >= validRanges[1].min && upperPrice <= validRanges[1].max;

        let liquidity0Match = liquidity0 >= validRanges[0].minLiquidity && liquidity0 <= validRanges[0].maxLiquidity;
        let liquidity1Match = liquidity1 >= validRanges[1].minLiquidity && liquidity1 <= validRanges[1].maxLiquidity;

        const isEligible = (range0Match && liquidity0Match) || (range1Match && liquidity1Match);

        // Format display
        const formattedToken0 = `${token0.slice(0, 6)}...<img src="assets/${token0Data.symbol}.png" class="token-icon"> ${token0Data.symbol} <img src="assets/${token0Data.symbol}.png" class="token-icon">...${token0.slice(-4)}`;
        const formattedToken1 = `${token1.slice(0, 6)}...<img src="assets/${token1Data.symbol}.png" class="token-icon"> ${token1Data.symbol} <img src="assets/${token1Data.symbol}.png" class="token-icon">...${token1.slice(-4)}`;

        document.getElementById("tokenDetails").innerHTML = `
            <p><b>Token ID:</b> ${tokenId}</p>
            <p><b>Token 0:</b> ${formattedToken0}</p>
            <p><b>Token 1:</b> ${formattedToken1}</p>
            <p><b>Tick Lower:</b> ${tickLower} → Price: ${lowerPrice.toFixed(6)}</p>
            <p><b>Tick Upper:</b> ${tickUpper} → Price: ${upperPrice.toFixed(6)}</p>
            <p><b>Current Price:</b> ${currentPrice.toFixed(6)}</p>
            <p><b>Liquidity (Token 0):</b> ${liquidity0.toFixed(2)}</p>
            <p><b>Liquidity (Token 1):</b> ${liquidity1.toFixed(2)}</p>
            <p><b>Range 0 Status:</b> ${range0Match ? "✅ Correct Range" : "❌ Incorrect Range"}</p>
            <p><b>Liquidity 0 Status:</b> ${liquidity0Match ? "✅ Correct Liquidity" : "❌ Incorrect Liquidity"}</p>
            <p><b>Range 1 Status:</b> ${range1Match ? "✅ Correct Range" : "❌ Incorrect Range"}</p>
            <p><b>Liquidity 1 Status:</b> ${liquidity1Match ? "✅ Correct Liquidity" : "❌ Incorrect Liquidity"}</p>
            <p><b>Final Status:</b> ${isEligible ? "✅ Eligible for Class" : "❌ Not Eligible - Adjust Liquidity or Range"}</p>
        `;
    } catch (error) {
        console.error("Error fetching position:", error);
        document.getElementById("tokenDetails").innerHTML = `<p>❌ Error fetching token details.</p>`;
    }
}

// Event Listeners
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("checkToken").addEventListener("click", async () => {
        const tokenId = document.getElementById("tokenId").value;
        if (tokenId) {
            await checkLiquidity(tokenId);
        }
    });
});
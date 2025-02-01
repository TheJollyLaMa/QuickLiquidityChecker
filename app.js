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

        const currentTick = await getCurrentTick(token0, token1);
        console.log("Current Tick:", currentTick);

        const inRange = currentTick >= tickLower && currentTick <= tickUpper;

        // Convert Ticks to Human-Readable Prices
        const lowerPrice = tickToPrice(tickLower);
        const upperPrice = tickToPrice(tickUpper);
        const currentPrice = tickToPrice(currentTick);

        document.getElementById("tokenDetails").innerHTML = `
            <p><b>Token ID:</b> ${tokenId}</p>
            <p><b>Token 0:</b> ${token0}</p>
            <p><b>Token 1:</b> ${token1}</p>
            <p><b>Tick Lower:</b> ${tickLower} → Price: ${lowerPrice.toFixed(6)}</p>
            <p><b>Tick Upper:</b> ${tickUpper} → Price: ${upperPrice.toFixed(6)}</p>
            <p><b>Liquidity:</b> ${liquidity.toString()}</p>
            <p><b>Current Tick:</b> ${currentTick} → Price: ${currentPrice.toFixed(6)}</p>
            <p><b>Status:</b> ${inRange ? "In Range ✅" : "Out of Range ❌"}</p>
        `;
    } catch (error) {
        console.error("Error fetching position:", error);
    }
}

async function getCurrentTick(token0, token1) {
    try {
        // ✅ Ensure ABI is loaded before using the contract
        if (!ALGEBRA_ABI.length) {
            console.error("ABI not loaded yet!");
            return;
        }

        // ✅ Ensure contract instance is properly initialized
        const contract = new ethers.Contract(ALGEBRA_POSITION_MANAGER, new ethers.utils.Interface(ALGEBRA_ABI), provider);
        console.log("Contract Instance:", contract);
        console.log("Factory Function Exists:", typeof contract.factory === "function");

        // ✅ Fetch the Algebra Factory address
        const factoryAddress = await contract.factory();
        console.log("Factory Address:", factoryAddress);

        if (!factoryAddress || factoryAddress === ethers.constants.AddressZero) {
            throw new Error("Factory contract address not found.");
        }

        // ✅ Define Factory ABI for querying pools
        const factoryABI = [
            "function poolByPair(address token0, address token1) view returns (address)"
        ];
        
        // ✅ Initialize the Factory Contract
        const factoryContract = new ethers.Contract(factoryAddress, factoryABI, provider);

        // ✅ Fetch the pool address
        const poolAddress = await factoryContract.poolByPair(token0, token1);
        console.log("Pool Address:", poolAddress);

        if (!poolAddress || poolAddress === ethers.constants.AddressZero) {
            throw new Error("Pool not found for this token pair.");
        }

        // ✅ Fetch current tick from the pool
        const poolABI = [
            "function globalState() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)"
        ];
        
        const poolContract = new ethers.Contract(poolAddress, poolABI, provider);
        const { tick } = await poolContract.globalState();
        console.log("Current Tick:", tick);

        return tick;
    } catch (error) {
        console.error("Error fetching current tick:", error);
        return null;
    }
}

function holdToken(tokenId) {
    console.log("Holding token:", tokenId);
    alert(`Token ${tokenId} is now being held.`);
    document.getElementById("holdToken").disabled = true;
    document.getElementById("releaseToken").disabled = false;
}

async function releaseToken(tokenId) {
    console.log("Releasing token:", tokenId);
    alert(`Token ${tokenId} Released!`);
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("checkToken").addEventListener("click", async () => {
        const tokenId = document.getElementById("tokenId").value;
        if (tokenId) {
            await checkLiquidity(tokenId);
        }
    });

    document.getElementById("holdToken").addEventListener("click", async () => {
        const tokenId = document.getElementById("tokenId").value;
        if (tokenId) {
            await holdToken(tokenId);
        }
    });

    document.getElementById("releaseToken").addEventListener("click", async () => {
        const tokenId = document.getElementById("tokenId").value;
        if (tokenId) {
            await releaseToken(tokenId);
        }
    });
});
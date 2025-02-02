const { ethers } = window;
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

const ALGEBRA_POSITION_MANAGER = "0x8eF88E4c7CfbbaC1C163f7eddd4B578792201de6"; // Algebra Positions NFT-V1 on QuickSwap
let ALGEBRA_ABI = [];

// Store liquidity positions for visualization
let liquidityPositions = {};
let previousTick = 0;
const maxLiquiditySeats = 12;
let lockedTokens = new Set();

// Load ABI dynamically before contract initialization
async function loadABI() {
    try {
        const response = await fetch("abi.json");
        ALGEBRA_ABI = await response.json();
    } catch (error) {
        console.error("Error loading ABI:", error);
    }
}

// Initialize contract after ABI is loaded
async function getContract() {
    if (ALGEBRA_ABI.length === 0) await loadABI();
    return new ethers.Contract(ALGEBRA_POSITION_MANAGER, ALGEBRA_ABI, provider);
}

// Convert Ticks to Prices
function tickToPrice(tick) {
    return Math.pow(1.0001, tick);
}

// Fetch tickLower, tickUpper & current tick
async function updateLiquidityVisualization(tokenId) {
    try {
        if (!tokenId || lockedTokens.has(tokenId)) return;

        const contract = await getContract();
        const position = await contract.positions(tokenId);
        const { token0, token1, tickLower, tickUpper, liquidity } = position;

        if (liquidity.isZero()) {
            console.warn(`Liquidity position for ${tokenId} has no funds.`);
            return;
        }

        // Convert tick to price
        const lowerPrice = tickToPrice(tickLower);
        const upperPrice = tickToPrice(tickUpper);

        const currentTick = await getCurrentTick(token0, token1);
        const currentPrice = tickToPrice(currentTick);

        // Store tick ranges for drawing circles
        liquidityPositions[tokenId] = {
            lowerTick: tickLower,
            upperTick: tickUpper,
            liquidity,
        };

        // Determine tick movement direction
        const tickMoveUp = currentTick > previousTick;
        previousTick = currentTick;

        drawLiquidityVisualization(tickMoveUp ? "indigo" : "purple");
    } catch (error) {
        console.error(`Error updating liquidity for token ${tokenId}:`, error);
    }
}

// Fetch the current tick price
async function getCurrentTick(token0, token1) {
    try {
        const contract = await getContract();
        const factoryAddress = await contract.factory();

        const factory_response = await fetch("factory_abi.json");
        const factoryABI = await factory_response.json();

        const factoryContract = new ethers.Contract(factoryAddress, factoryABI, provider);

        const poolAddress = await factoryContract.poolByPair(token0, token1);
        if (poolAddress === ethers.constants.AddressZero) {
            console.error("No pool found for this token pair.");
            return null;
        }

        const pool_response = await fetch("pool_abi.json");
        const poolABI = await pool_response.json();
        const poolContract = new ethers.Contract(poolAddress, poolABI, provider);

        const globalState = await poolContract.globalState();
        if (!globalState || typeof globalState.tick === "undefined") {
            console.error("Error: globalState.tick is undefined.");
            return null;
        }

        const currentTick = ethers.BigNumber.from(globalState.tick).toNumber();
        console.log("Current Tick:", currentTick);
        return currentTick;

    } catch (error) {
        console.error("Error fetching current tick:", error);
        return null;
    }
}

// Draw Liquidity Visualization
function drawLiquidityVisualization(glowColor = "rgba(255, 255, 255, 0.8)") {
    const canvas = document.getElementById("liquidityChart");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw SecretPyramid watermark
    const pyramidImg = new Image();
    pyramidImg.src = "assets/SecretPyramid.png";
    pyramidImg.onload = function () {
        ctx.globalAlpha = 0.2;
        ctx.drawImage(pyramidImg, 50, 50, 300, 300);
        ctx.globalAlpha = 1;
    };

    // Set opacity based on liquidity locked
    const liquidityOpacity = Math.min(1, lockedTokens.size / maxLiquiditySeats);
    const glowEffect = liquidityOpacity * 20; // Adjust the glow intensity
    
    ctx.shadowBlur = glowEffect;
    ctx.shadowColor = `rgba(255, 0, 255, ${liquidityOpacity})`;
    ctx.fill();
    
    // Draw liquidity positions
    Object.values(liquidityPositions).forEach(({ lowerTick, upperTick }) => {
        const lowerRadius = Math.max(30, Math.abs(lowerTick) / 10);
        const upperRadius = Math.max(60, Math.abs(upperTick) / 10);

        // Outer Liquidity Range (Upper Tick)
        ctx.beginPath();
        ctx.arc(200, 200, upperRadius, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(0, 255, 234, ${liquidityOpacity})`;
        ctx.fill();

        // Inner Liquidity Range (Lower Tick)
        ctx.beginPath();
        ctx.arc(200, 200, lowerRadius, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(255, 0, 255, ${liquidityOpacity})`;
        ctx.fill();
    });

    // Align LP Token Icons
    positionLpTokens();

    // Align Balance Tokens
    updateTokenBalancePositions();
}

// 🔥 Fix: Properly position LP tokens around circles
function positionLpTokens() {
    const outerContainer = document.getElementById("outerLpTokens");
    const innerContainer = document.getElementById("innerLpTokens");

    outerContainer.innerHTML = "";
    innerContainer.innerHTML = "";

    let indexOuter = 0, indexInner = 0;
    Object.entries(liquidityPositions).forEach(([tokenId, { lowerTick, upperTick }]) => {
        const tokenElement = document.createElement("img");
        tokenElement.src = "assets/lp-token.png"; 
        tokenElement.classList.add("lp-token");

        // Align properly within circles
        tokenElement.style.position = "absolute";
        tokenElement.style.bottom = "50px"; 
        tokenElement.style.left = `${180 + (indexOuter * 35)}px`;

        if (upperTick > 10000) {
            outerContainer.appendChild(tokenElement);
            indexOuter++;
        } else {
            innerContainer.appendChild(tokenElement);
            indexInner++;
        }
    });
}

// 🔥 Fix: Rotate balance tokens correctly
function updateTokenBalancePositions() {
    const balanceRatio = Math.random();
    const angle = balanceRatio * Math.PI * 2; 

    document.getElementById("outerTokenA").style.transform = `translate(${120 * Math.cos(angle)}px, ${120 * Math.sin(angle)}px)`;
    document.getElementById("outerTokenB").style.transform = `translate(${120 * Math.cos(-angle)}px, ${120 * Math.sin(-angle)}px)`;
    
    document.getElementById("innerTokenA").style.transform = `translate(${60 * Math.cos(angle)}px, ${60 * Math.sin(angle)}px)`;
    document.getElementById("innerTokenB").style.transform = `translate(${60 * Math.cos(-angle)}px, ${60 * Math.sin(-angle)}px)`;
}

setInterval(drawLiquidityVisualization, 5000);
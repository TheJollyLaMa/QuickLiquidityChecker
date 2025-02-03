// ✅ Fetch Token Information with Liquidity Calculation
async function getTokenInfo(tokenId) {
    try {
        // ✅ Initialize Position Manager Contract
        const positionManager = new ethers.Contract(ALGEBRA_POSITION_MANAGER, ALGEBRA_ABI, provider);
        const poolContract = new ethers.Contract(POOL_CONTRACT_ADDRESS, POOL_ABI, provider);

        // ✅ Get Position Details
        const position = await positionManager.positions(tokenId);
        const globalState = await poolContract.globalState();
        const currentTick = globalState.tick;

        console.log(`✅ Current Tick: ${currentTick}`);
        const price = Math.pow(1.0001, currentTick);

        // ✅ Static Token Pair
        const token0 = "USDGLO";
        const token1 = "OMMM";

        // ✅ Extract Tick Range and Liquidity Info
        const tickLower = position.tickLower.toString();
        const tickUpper = position.tickUpper.toString();
        const liquidity = BigInt(position.liquidity.toString());

        console.log(`✅ Token ${tokenId} Data:`, { tickLower, tickUpper, liquidity });

        // ✅ Convert Liquidity to Token Amounts
        const { amount0, amount1 } = calculateTokenAmounts(liquidity, tickLower, tickUpper, currentTick);

        return { token0, token1, tickLower, tickUpper, liquidity, amount0, amount1 };

    } catch (error) {
        console.error(`❌ Error fetching token ${tokenId} data:`, error);
        return null;
    }
}

// ✅ Convert Liquidity into Properly Scaled Token Balances
function calculateTokenAmounts(liquidity, tickLower, tickUpper, currentTick) {
    let sqrtPriceLower = Math.pow(1.0001, tickLower / 2);
    let sqrtPriceUpper = Math.pow(1.0001, tickUpper / 2);
    let sqrtCurrentPrice = Math.pow(1.0001, currentTick / 2);

    let amount0 = BigInt(liquidity) * BigInt(10 ** 18);  // Convert to proper decimals
    let amount1 = BigInt(liquidity) * BigInt(10 ** 18);

    if (currentTick < tickLower) {
        // 🟢 Only token0 is provided
        amount0 = Number(liquidity) * (1 / sqrtPriceLower - 1 / sqrtPriceUpper);
        amount1 = 0;
    } else if (currentTick >= tickUpper) {
        // 🔴 Only token1 is provided
        amount1 = Number(liquidity) * (sqrtPriceUpper - sqrtPriceLower);
        amount0 = 0;
    } else {
        // 🟡 Both tokens are provided
        amount0 = Number(liquidity) * (1 / sqrtCurrentPrice - 1 / sqrtPriceUpper);
        amount1 = Number(liquidity) * (sqrtCurrentPrice - sqrtPriceLower);
    }

    // ✅ Format to Proper Decimal Places
    return { 
        amount0: (parseFloat(amount0) / 1e18).toFixed(2),  
        amount1: (parseFloat(amount1) / 1e18).toFixed(2) 
    };
}

function updateTokenPositions(broadToken, targetedToken) {
    console.log("✅ updateTokenPositions() Called");

    const chartContainer = document.querySelector(".chart-container");
    const containerRect = chartContainer.getBoundingClientRect();

    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;
    const radius = containerRect.width * 0.38; // ✅ Keep inside NFT arc

    // ✅ Check if elements exist
    const usdgloToken = document.querySelector(".moving-token.usdglo");
    const ommmToken = document.querySelector(".moving-token.ommm");

    if (!usdgloToken || !ommmToken) {
        console.error("❌ Moving tokens not found in the DOM");
        return;
    }

    console.log("✅ Found moving tokens in DOM");

    // ✅ Liquidity Ratio Calculation
    let totalLiquidity = parseFloat(targetedToken.amount0) + parseFloat(targetedToken.amount1);
    let usdgloRatio = parseFloat(targetedToken.amount0) / totalLiquidity;
    let ommmRatio = parseFloat(targetedToken.amount1) / totalLiquidity;

    console.log(`💰 Liquidity Ratio - USDGLO: ${usdgloRatio}, OMMM: ${ommmRatio}`);

    // ✅ Define Initial & Final Angles
    let usdgloStartAngle = Math.PI * 1.2; // ✅ 10 o’clock
    let usdgloEndAngle = Math.PI * 1.5; // ✅ 12 o’clock (max)

    let ommmStartAngle = Math.PI * 0.8; // ✅ 2 o’clock
    let ommmEndAngle = Math.PI * 0.5; // ✅ 12 o’clock (max)

    // ✅ Interpolate Position Based on Balance
    let usdgloAngle = usdgloStartAngle + (usdgloRatio * (usdgloEndAngle - usdgloStartAngle));
    let ommmAngle = ommmStartAngle - (ommmRatio * (ommmStartAngle - ommmEndAngle));

    console.log(`📍 New Positions - USDGLO Angle: ${usdgloAngle}, OMMM Angle: ${ommmAngle}`);

    // ✅ Convert Angles to X/Y Positions
    let usdgloX = centerX + radius * Math.cos(usdgloAngle);
    let usdgloY = centerY - radius * Math.sin(usdgloAngle);

    let ommmX = centerX + radius * Math.cos(ommmAngle);
    let ommmY = centerY - radius * Math.sin(ommmAngle);

    console.log(`📌 New Coordinates - USDGLO: (${usdgloX}, ${usdgloY}), OMMM: (${ommmX}, ${ommmY})`);

    // ✅ Apply Transformations to Tokens
    usdgloToken.style.left = `${usdgloX}px`;
    usdgloToken.style.top = `${usdgloY}px`;

    ommmToken.style.left = `${ommmX}px`;
    ommmToken.style.top = `${ommmY}px`;
}


// ✅ Check Tokens & Update UI
async function checkTokens() {
    await initializeProvider();

    // ✅ Fetch Data for Our Two Reference Tokens
    const broadTokenData = await getTokenInfo(150843);
    const targetedTokenData = await getTokenInfo(150879);

    // ✅ Update UI Based on Validation
    updateLiquidityDetails(broadTokenData, targetedTokenData);
}

// ✅ Function to Update Liquidity Token Details in UI
function updateLiquidityDetails(broadToken, targetedToken) {
    // Find the HTML elements
    const broadInfoElement = document.getElementById("broad-range-info");
    const targetedInfoElement = document.getElementById("targeted-range-info");
    const outerLpValues = document.getElementById("outerLpValues");
    const innerLpValues = document.getElementById("innerLpValues");

    if (!broadToken || !targetedToken) {
        broadInfoElement.innerHTML = "❌ Error loading token data.";
        targetedInfoElement.innerHTML = "❌ Error loading token data.";
        return;
    }

    // Format the tick range
    const broadTickRange = broadToken.tickUpper === "Infinity"
        ? "0 → ♾️"
        : `${broadToken.tickLower} → ${broadToken.tickUpper}`;

    const targetedTickRange = `${targetedToken.tickLower} → ${targetedToken.tickUpper}`;

    // ✅ Update Top Liquidity Details Section
    broadInfoElement.innerHTML = `
        ✅ Token ID: 150843 <br>
        🔹 **Pair**: USDGLO / OMMM <br>
        📉 **Tick Range**: ${broadTickRange} <br>
        💰 **Liquidity**: ${broadToken.amount0} OMMM / ${broadToken.amount1} USDGLO <br>
    `;

    targetedInfoElement.innerHTML = `
        ✅ Token ID: 150879 <br>
        🔹 **Pair**: USDGLO / OMMM <br>
        📉 **Tick Range**: ${targetedTickRange} <br>
        💰 **Liquidity**: ${targetedToken.amount0} OMMM / ${targetedToken.amount1} USDGLO <br>
    `;


    // ✅ Update Liquidity Values in Visualizer
    outerLpValues.innerHTML = `
        <div class="outer-liquidity usdglo">${broadToken.amount1}</div>
        <div class="outer-liquidity ommm">${broadToken.amount0}</div>
    `;

    innerLpValues.innerHTML = `
        <div class="inner-liquidity usdglo">${targetedToken.amount1}</div>
        <div class="inner-liquidity ommm">${targetedToken.amount0}</div>
    `;


    console.log("✅ UI Updated with Liquidity Values");

    updateTokenPositions(broadToken, targetedToken);

}

// ✅ Check if an NFT Meets Project Standards
function validateToken(tokenData, isBroadRange) {
    if (!tokenData) return false;

    // ✅ Define Standard Criteria
    const expectedGLO = "49.99";
    const expectedOmmm = isBroadRange ? "600" : "1606";
    const expectedTickLower = isBroadRange ? "0" : "0.04443";
    const expectedTickUpper = isBroadRange ? "Infinity" : "1.0811";

    // ✅ Validate Liquidity & Tick Ranges
    const liquidityValid = tokenData.amount0 === expectedGLO && tokenData.amount1 === expectedOmmm;
    const rangeValid = tokenData.tickLower === expectedTickLower && tokenData.tickUpper === expectedTickUpper;

    return liquidityValid && rangeValid;
}

// ✅ Main Function to Run on Page Load
async function checkTokens() {
    await initializeProvider();

    // ✅ Fetch Data for Our Two Reference Tokens
    const broadTokenData = await getTokenInfo(150843);
    const targetedTokenData = await getTokenInfo(150879);

    // ✅ Validate Standard
    const isBroadValid = validateToken(broadTokenData, true);
    const isTargetedValid = validateToken(targetedTokenData, false);

    // ✅ Update UI Based on Validation
    updateLiquidityDetails(broadTokenData, targetedTokenData);
}
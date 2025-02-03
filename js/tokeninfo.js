
// ✅ Fetch Token Information
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

// ✅ Convert Liquidity into Token Balances
function calculateTokenAmounts(liquidity, tickLower, tickUpper, currentTick) {
    let sqrtPriceLower = Math.pow(1.0001, tickLower / 2);
    let sqrtPriceUpper = Math.pow(1.0001, tickUpper / 2);
    let sqrtCurrentPrice = Math.pow(1.0001, currentTick / 2);

    let amount0 = 0, amount1 = 0;

    if (currentTick < tickLower) {
        // 🟢 Only token0 is provided
        amount0 = Number(liquidity) * (1 / sqrtPriceLower - 1 / sqrtPriceUpper);
    } else if (currentTick >= tickUpper) {
        // 🔴 Only token1 is provided
        amount1 = Number(liquidity) * (sqrtPriceUpper - sqrtPriceLower);
    } else {
        // 🟡 Both tokens are provided
        amount0 = Number(liquidity) * (1 / sqrtCurrentPrice - 1 / sqrtPriceUpper);
        amount1 = Number(liquidity) * (sqrtCurrentPrice - sqrtPriceLower);
    }

    return { 
        amount0: amount0.toFixed(4), 
        amount1: amount1.toFixed(4) 
    };
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

    // Format the display data
    broadInfoElement.innerHTML = `
        ✅ Token ID: 150843 <br>
        🔹 **Pair**: USDGLO / OMMM <br>
        📉 **Tick Range**: ${broadTickRange} <br>
        💰 **Liquidity**: ${broadToken.amount0} USDGLO / ${broadToken.amount1} OMMM <br>
    `;

    targetedInfoElement.innerHTML = `
        ✅ Token ID: 150879 <br>
        🔹 **Pair**: USDGLO / OMMM <br>
        📉 **Tick Range**: ${targetedTickRange} <br>
        💰 **Liquidity**: ${targetedToken.amount0} USDGLO / ${targetedToken.amount1} OMMM <br>
    `;
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

// ✅ Function to Update Liquidity Token Details in UI
function updateLiquidityDetails(broadToken, targetedToken) {
    // Find the HTML elements
    const broadInfoElement = document.getElementById("broad-range-info");
    const targetedInfoElement = document.getElementById("targeted-range-info");

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

    // Format the display data
    broadInfoElement.innerHTML = `
        ✅ Token ID: 150843 <br>
        🔹 **Pair**: USDGLO / OMMM <br>
        📉 **Tick Range**: ${broadTickRange} <br>
        💰 **Liquidity**: ${broadToken.amount0} USDGLO / ${broadToken.amount1} OMMM <br>
    `;

    targetedInfoElement.innerHTML = `
        ✅ Token ID: 150879 <br>
        🔹 **Pair**: USDGLO / OMMM <br>
        📉 **Tick Range**: ${targetedTickRange} <br>
        💰 **Liquidity**: ${targetedToken.amount0} USDGLO / ${targetedToken.amount1} OMMM <br>
    `;
}
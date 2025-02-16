// ✅ Fetch Token Information with Liquidity Calculation
async function getTokenInfo(tokenId) {
    try {
        const positionManager = new ethers.Contract(ALGEBRA_POSITION_MANAGER, ALGEBRA_ABI, provider);
        const poolContract = new ethers.Contract(POOL_CONTRACT_ADDRESS, POOL_ABI, provider);

        const position = await positionManager.positions(tokenId);
        const globalState = await poolContract.globalState();
        const currentTick = globalState.tick;

        console.log(`✅ Current Tick: ${currentTick}`);
        const price = Math.pow(1.0001, currentTick);

        const token0 = "USDGLO";
        const token1 = "OMMM";

        const tickLower = position.tickLower.toString();
        const tickUpper = position.tickUpper.toString();
        const liquidity = BigInt(position.liquidity.toString());

        console.log(`✅ Token ${tokenId} Data:`, { tickLower, tickUpper, liquidity });

        const { amount0, amount1 } = calculateTokenAmounts(liquidity, tickLower, tickUpper, currentTick);

        return { tokenId, token0, token1, tickLower, tickUpper, liquidity, amount0, amount1 };

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
    let usdgloStartAngle = Math.PI * 1.25; // 🔹 Shifted slightly towards 10
    let usdgloEndAngle = Math.PI * 1.5; // ✅ 12 o’clock (max)
    let ommmStartAngle = Math.PI * 0.75; // 🔹 Shifted slightly towards 2
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

// // ✅ Calculate Outer Balance Position
function calculateOuterTokenPosition(index, total, radius, containerCenterX, containerCenterY) {
    // 🔄 Flip the Arc: Upside-down Bowl (Reflect Over Y-Axis)
    const angle = (index / (total - 1)) * Math.PI; // Maps from 0 to π (0° to 180°)

    const x = containerCenterX + radius * Math.cos(angle);
    const y = containerCenterY - radius * Math.sin(angle); // 🔄 Flip Y direction

    return { 
        x: x ,  // ✅ Adjust to center
        y: y   // ✅ Adjust to center
    };
}

function positionOuterBalanceTokens(gloLiquidityRatio, ommmLiquidityRatio) {
    const container = document.querySelector(".chart-container");
    const containerRect = container.getBoundingClientRect();

    const containerCenterX = containerRect.width / 2.01;
    const containerCenterY = containerRect.height / 1.83;

    const outerRadius = containerRect.width * 0.635; // Keep outer radius large

    // ✅ Interpolate GLO & OMMM positions based on liquidity balance
    let gloIndex = 2 + (gloLiquidityRatio * 8);  // Move from 10 → 12
    let ommmIndex = 10 - (ommmLiquidityRatio * 8); // Move from 2 → 12

    // ✅ Calculate Positions
    const gloPosition = calculateOuterTokenPosition(gloIndex, 12, outerRadius, containerCenterX, containerCenterY);
    const ommmPosition = calculateOuterTokenPosition(ommmIndex, 12, outerRadius, containerCenterX, containerCenterY);

    // ✅ Update DOM Positions
    const gloToken = document.querySelector(".usdglo-outer");
    const ommmToken = document.querySelector(".ommm-outer");

    if (gloToken) {
        gloToken.style.left = `${gloPosition.x}px`;
        gloToken.style.top = `${gloPosition.y}px`;
    }

    if (ommmToken) {
        ommmToken.style.left = `${ommmPosition.x}px`;
        ommmToken.style.top = `${ommmPosition.y}px`;
    }
}

// ✅ Check Tokens & Update UI
async function checkTokens() {
    await initializeProvider();

    const positionManager = new ethers.Contract(ALGEBRA_POSITION_MANAGER, ALGEBRA_ABI, provider);
    const signerAddress = await signer.getAddress();

    // ✅ Fetch all owned LP NFTs
    const balance = await positionManager.balanceOf(signerAddress);
    const tokenIds = [];

    for (let i = 0; i < balance; i++) {
        const tokenId = await positionManager.tokenOfOwnerByIndex(signerAddress, i);
        tokenIds.push(tokenId.toString());
    }

    console.log("✅ Found LP NFTs:", tokenIds);

    // ✅ Ensure the result is always an array
    let tokenDataArray = await Promise.all(tokenIds.map(getTokenInfo));

    // ✅ Filter out null results
    tokenDataArray = tokenDataArray.filter(data => data !== null);

    // ✅ Ensure it's an array before passing to updateLiquidityDetails
    if (!Array.isArray(tokenDataArray)) {
        console.error("❌ Expected tokenDataArray to be an array, received:", tokenDataArray);
        tokenDataArray = [];
    }

    updateLiquidityDetails(tokenDataArray);
}

// ✅ Function to Update Liquidity Token Details in UI
function updateLiquidityDetails(tokenDataArray) {
    // ✅ Convert to array if needed
    if (!Array.isArray(tokenDataArray)) {
        console.warn("⚠️ Converting tokenDataArray to an array:", tokenDataArray);
        tokenDataArray = [tokenDataArray];  // Wrap it as an array
    }

    const broadInfoElement = document.getElementById("broad-range-info");
    const targetedInfoElement = document.getElementById("targeted-range-info");

    if (!tokenDataArray.length) {
        broadInfoElement.innerHTML = "❌ No LP tokens found.";
        targetedInfoElement.innerHTML = "❌ No LP tokens found.";
        return;
    }

    let broadHTML = "";
    let targetedHTML = "";

    tokenDataArray.forEach((token, index) => {
        if (!token) return;

        const tickRange = token.tickUpper === "Infinity" ? "0 → ♾️" : `${token.tickLower} → ${token.tickUpper}`;

        const tokenHTML = `
            ✅ Token ID: ${token.tokenId} <br>
            🔹 **Pair**: ${token.token0} / ${token.token1} <br>
            📉 **Tick Range**: ${tickRange} <br>
            💰 **Liquidity**: ${token.amount0} ${token.token0} / ${token.amount1} ${token.token1} <br>
        `;

        if (index < 6) {
            broadHTML += tokenHTML + "<br>";
        } else {
            targetedHTML += tokenHTML + "<br>";
        }
    });

    broadInfoElement.innerHTML = broadHTML || "❌ No broad-range LP tokens.";
    targetedInfoElement.innerHTML = targetedHTML || "❌ No targeted-range LP tokens.";

    console.log("✅ UI Updated with Dynamic LP Token Data");
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
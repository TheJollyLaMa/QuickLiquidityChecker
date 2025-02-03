const ALGEBRA_POSITION_MANAGER = "0x8eF88E4c7CfbbaC1C163f7eddd4B578792201de6";
let provider;

// ✅ Initialize Provider
async function initializeProvider() {
    if (typeof window.ethereum !== "undefined") {
        const { ethers } = window;
        provider = new ethers.providers.Web3Provider(window.ethereum);
    } else {
        console.error("❌ No Ethereum provider found. Make sure MetaMask is installed.");
    }
}

// ✅ Fetch Token Information
async function getTokenInfo(tokenId) {
    try {
        const contract = new ethers.Contract(ALGEBRA_POSITION_MANAGER, ALGEBRA_ABI, provider);
        const position = await contract.positions(tokenId);

        const token0 = await contract.token0();
        const token1 = await contract.token1();

        const tickLower = position.tickLower.toString();
        const tickUpper = position.tickUpper.toString();
        const liquidity = position.liquidity.toString();
        const amount0 = position.tokensOwed0.toString();
        const amount1 = position.tokensOwed1.toString();

        console.log(`✅ Token ${tokenId} Info:`);
        console.log(`   - Token 0 (GLO): ${token0}`);
        console.log(`   - Token 1 (OMMM): ${token1}`);
        console.log(`   - Liquidity Provided: ${liquidity}`);
        console.log(`   - Token 0 Amount: ${amount0}`);
        console.log(`   - Token 1 Amount: ${amount1}`);
        console.log(`   - Tick Range: ${tickLower} → ${tickUpper}`);

        return { token0, token1, tickLower, tickUpper, liquidity, amount0, amount1 };

    } catch (error) {
        console.error(`❌ Error fetching token ${tokenId} data:`, error);
        return null;
    }
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
    const broadTokenData = await getTokenInfo(150879);
    const targetedTokenData = await getTokenInfo(150843);

    // ✅ Validate Standard
    const isBroadValid = validateToken(broadTokenData, true);
    const isTargetedValid = validateToken(targetedTokenData, false);

    console.log(`✅ Broad-Range Token 150879 is ${isBroadValid ? "✅ VALID" : "❌ INVALID"}`);
    console.log(`✅ Targeted-Range Token 150843 is ${isTargetedValid ? "✅ VALID" : "❌ INVALID"}`);
}

// ✅ Run this on load
document.addEventListener("DOMContentLoaded", checkTokens);
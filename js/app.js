let provider, signer;

const ALGEBRA_POSITION_MANAGER = "0x8eF88E4c7CfbbaC1C163f7eddd4B578792201de6";
const POOL_CONTRACT_ADDRESS = "0xf1a9a6a83077b73f662211b3fdecfa0cf13ceec7";

let ALGEBRA_ABI = [];
let POOL_ABI = [];
let FACTORY_ABI = [];

// ✅ Initialize provider ONCE
async function initializeProvider() {
    if (typeof window.ethereum !== "undefined") {
        const { ethers } = window;
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
    } else {
        console.error("❌ No Ethereum provider found. Make sure MetaMask is installed.");
    }
}

// ✅ Load ABIs from JSON files once
async function loadABIs() {
    try {
        ALGEBRA_ABI = await (await fetch("abis/abi.json")).json();
        FACTORY_ABI = await (await fetch("abis/factory_abi.json")).json();
        POOL_ABI = await (await fetch("abis/pool_abi.json")).json();
    } catch (error) {
        console.error("❌ Error loading ABIs:", error);
    }
}

// ✅ Function to Get Current Tick (Price)
async function getCurrentTick() {
    try {
        const poolContract = new ethers.Contract(POOL_CONTRACT_ADDRESS, POOL_ABI, provider);
        const globalState = await poolContract.globalState();
        const currentTick = globalState.tick;
        console.log(`✅ Current Tick: ${currentTick}`);
        const price = Math.pow(1.0001, currentTick);
        console.log(`✅ Current Price: ${price.toFixed(6)}`);
        updatePriceDisplay(price.toFixed(4));
    } catch (error) {
        console.error("❌ Error fetching current tick:", error);
    }
}

// ✅ Function to Update Price Display
function updatePriceDisplay(price) {
    let priceElement = document.getElementById("current-price");

    if (!priceElement) {
        priceElement = document.createElement("div");
        priceElement.id = "current-price";
        priceElement.classList.add("current-price");
        document.querySelector(".chart-container").appendChild(priceElement);
    }

    priceElement.textContent = `${price} USDGLO/OMMM`;
}

// ✅ Define 12 NFTs for each bowl
const exampleNFTs = {
    broadRange: [150879, 150880, 150881, 150882, 150883, 150884, 150885, 150886, 150887, 150888, 150889, 150890],
    targetedRange: [150843, 150844, 150845, 150846, 150847, 150848, 150849, 150850, 150851, 150852, 150853, 150854]
};

// ✅ Load and Display NFTs in Two Bowls
async function loadLiquidityNFTs() {
    try {
        const broadNFTData = await Promise.all(
            exampleNFTs.broadRange.map(tokenId => getNFTData(tokenId))
        );
        const targetedNFTData = await Promise.all(
            exampleNFTs.targetedRange.map(tokenId => getNFTData(tokenId))
        );

        // ✅ Arrange Outer Bowl NFTs
        broadNFTData.forEach((nft, index) => {
            if (nft) {
                displayNFT(`broad-range-nft-${index + 1}`, nft.image, `broad-range-nft-${index + 1}`);
            }
        });

        // ✅ Arrange Inner Bowl NFTs
        targetedNFTData.forEach((nft, index) => {
            if (nft) {
                displayNFT(`targeted-range-nft-${index + 1}`, nft.image, `targeted-range-nft-${index + 1}`);
            }
        });

        // ✅ Position NFTs Dynamically
        setTimeout(positionNFTs, 1000);

    } catch (error) {
        console.error("❌ Error loading NFTs:", error);
    }
}

// ✅ Display NFT at Correct Position in the Bowl
// ✅ Display NFT at Correct Position in the Bowl
function displayNFT(id, imageUrl, className) {
    const imgElement = document.createElement("img");
    imgElement.src = imageUrl;
    imgElement.alt = "Liquidity NFT";
    
    // Ensure inner NFTs get the correct class
    if (className.includes("targeted-range")) {
        imgElement.classList.add("liquidity-nft", "targeted-range-nft", className);
    } else {
        imgElement.classList.add("liquidity-nft", "broad-range-nft", className);
    }

    document.querySelector(".chart-container").appendChild(imgElement);
}

// ✅ Function to Calculate NFT Positions Along Semi-Circle
function calculateNFTPosition(index, total, radius, containerCenterX, containerCenterY) {
    const angle = Math.PI - (index / (total - 1)) * Math.PI; // Maps from 0 to π (180 degrees)
    const x = containerCenterX + radius * Math.cos(angle);
    const y = containerCenterY + radius * Math.sin(angle);
    const rotationAngle = (angle * 180) / Math.PI - 90;
    return { x, y, rotationAngle };
}

// ✅ Function to Position NFTs Dynamically
function positionNFTs() {
    const container = document.querySelector(".chart-container");
    const containerRect = container.getBoundingClientRect();
    const containerCenterX = containerRect.width / 2.01;
    const containerCenterY = containerRect.height / 1.83;

    const outerRadius = containerRect.width * 0.635; // Keep outer radius large
    const innerRadius = containerRect.width * 0.385; // Reduce inner radius

    exampleNFTs.broadRange.forEach((tokenId, index) => {
        const nftElement = document.querySelector(`.broad-range-nft-${index + 1}`);
        if (nftElement) {
            const { x, y, rotationAngle } = calculateNFTPosition(index, 12, outerRadius, containerCenterX, containerCenterY);
            nftElement.style.left = `${x - 1}px`;
            nftElement.style.bottom = `${containerRect.height - y - 38}px`;
            nftElement.style.transform = `translateX(-50%) rotate(${rotationAngle}deg)`;
        }
    });

    exampleNFTs.targetedRange.forEach((tokenId, index) => {
        const nftElement = document.querySelector(`.targeted-range-nft-${index + 1}`);
        if (nftElement) {
            const { x, y, rotationAngle } = calculateNFTPosition(index, 12, innerRadius, containerCenterX, containerCenterY);
            nftElement.style.left = `${x - 2}px`;
            nftElement.style.bottom = `${containerRect.height - y - 14}px`;
            nftElement.style.transform = `translateX(-50%) rotate(${rotationAngle}deg)`;
            
            // ✅ Force Smaller Size Here
            nftElement.style.width = "42px";
            nftElement.style.maxWidth = "42px";
            nftElement.style.maxHeight = "60px";
        }
    });
}
// ✅ Global Function to Fetch NFT Data
async function getNFTData(tokenId) {
    try {
        const contract = new ethers.Contract(ALGEBRA_POSITION_MANAGER, ALGEBRA_ABI, provider);
        const tokenURI = await contract.tokenURI(tokenId);

        if (!tokenURI) throw new Error(`Token URI not found for ${tokenId}`);

        const response = await fetch(tokenURI);
        if (!response.ok) throw new Error(`Failed to fetch metadata for ${tokenId}`);

        const metadata = await response.json();
        if (!metadata.image) throw new Error(`No image found for ${tokenId}`);

        // console.log(`✅ Fetched NFT ${tokenId}:`, metadata);
        return metadata;
    } catch (error) {
        console.error(`❌ Error fetching NFT ${tokenId} data:`, error);
        return null;
    }
}

// ✅ Wait for Page Load
document.addEventListener("DOMContentLoaded", async function () {
    await initializeProvider();
    await loadABIs();
    
    await checkTokens();

    // ✅ Load NFTs
    await loadLiquidityNFTs();

    // ✅ Fetch Current Price
    await getCurrentTick();
    setInterval(getCurrentTick, 30000);
});
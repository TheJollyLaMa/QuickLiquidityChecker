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
        // Connect to the pool contract
        const poolContract = new ethers.Contract(POOL_CONTRACT_ADDRESS, POOL_ABI, provider);

        // Call globalState() to get tick data
        const globalState = await poolContract.globalState();

        // Extract the tick value
        const currentTick = globalState.tick;
        console.log(`✅ Current Tick: ${currentTick}`);

        // Convert tick to human-readable price
        const price = Math.pow(1.0001, currentTick);
        console.log(`✅ Current Price: ${price.toFixed(6)}`);

        // Update the price display
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

// Wait for page load
document.addEventListener("DOMContentLoaded", async function () {
    // Example Liquidity NFTs
    const exampleNFTs = {
        broadRange: 150879, // Outer Circle NFT
        targetedRange: 150843 // Inner Circle NFT
    };

    // ✅ Set up Web3 provider
    await initializeProvider();
    await loadABIs();

    // ✅ Set up contract connection
    const contract = new ethers.Contract(ALGEBRA_POSITION_MANAGER, ALGEBRA_ABI, signer);

    // ✅ Function to Load NFT Data and Display
    async function loadLiquidityNFTs() {
        try {
            const broadNFTData = await getNFTData(exampleNFTs.broadRange);
            const targetedNFTData = await getNFTData(exampleNFTs.targetedRange);

            if (broadNFTData) {
                displayNFT("broad-range-nft", broadNFTData.image, "broad-range-nft");
            } else {
                console.warn("❌ Could not load Broad Range NFT");
            }

            if (targetedNFTData) {
                displayNFT("targeted-range-nft", targetedNFTData.image, "targeted-range-nft");
            } else {
                console.warn("❌ Could not load Targeted Range NFT");
            }
        } catch (error) {
            console.error("❌ Error loading NFTs:", error);
        }
    }

    // ✅ Fetch NFT Data from Algebra V1 Contract
    async function getNFTData(tokenId) {
        try {
            const tokenURI = await contract.tokenURI(tokenId);
            const metadata = await fetch(tokenURI).then(res => res.json());
            return metadata;
        } catch (error) {
            console.error(`❌ Error fetching NFT ${tokenId} data:`, error);
            return null;
        }
    }

    // ✅ Display NFT in the Visualizer
    function displayNFT(id, imageUrl, className) {
        const existingNFT = document.querySelector(`.${className}`);
        if (existingNFT) {
            existingNFT.remove(); // Ensure no duplicate images
        }

        const imgElement = document.createElement("img");
        imgElement.src = imageUrl;
        imgElement.alt = "Liquidity NFT";
        imgElement.classList.add("liquidity-nft", className); 
        document.querySelector(".chart-container").appendChild(imgElement);
    }

    // ✅ Load NFTs into Visualizer
    await loadLiquidityNFTs();

    await getCurrentTick();
    setInterval(getCurrentTick, 30000);
});
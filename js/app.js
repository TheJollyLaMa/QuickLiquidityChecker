let provider, signer;

const ALGEBRA_POSITION_MANAGER = "0x8eF88E4c7CfbbaC1C163f7eddd4B578792201de6";
const POOL_CONTRACT_ADDRESS = "0xf1a9a6a83077b73f662211b3fdecfa0cf13ceec7";
const LPLOCK_CONTRACT_ADDRESS = "0x432c8e225699a720584477A11138e87E72141395";//"0x13123fcbc2AE4f5C8315B4471ad9cDf9B7e0f59c"; //"0x168555CaA6731601E566E2b52C95B9CA247597dD"; //9th '0x3FC0A0ABd1b895D26fE6404B5332Ffc5e4796705'; //8th "0x43589D96FbA538570bDD0d1500bC09C9ee070194";//7th "0x52D60b724Cd1515BdD6B5c94472e118b9d954c58"; // 6th "0x3465Fd98C2572febdc0c4EAF9Ad0f9878349A2D1";//5th deployment "0x56643F2A8C75486C9521Ba6A985EdE92a5E36D27";// 4th deployment on polygon; "0x9769e8A1eD9731454C1C7b1E6dD0c327aD77545b" // third deployment on polygon // second deployment 1531 05Feb2025 on Polygon: 0x5be0F70e61B6842c126c17250F9f454103B72710 //first deployed 0435 05Feb2025 on polygon: 0x04A0d39e9E60981702B0F36d10F673943982369B
const SHT_CONTRACT_ADDRESS = "0x81cCeF6414D4CDbed9FD6Ea98c2D00105800cd78";

let ALGEBRA_ABI = [];
let POOL_ABI = [];
let FACTORY_ABI = [];
let LPLOCK_ABI = [];

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
        LPLOCK_ABI = await (await fetch("abis/LPLock_Stake_and_Farm_v0.4.11_abi.json")).json();
        ERC20_ABI = await (await fetch("abis/erc20_abi.json")).json();

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
        console.log("Fetching LP NFT IDs from the contract...");

        const positionManager = new ethers.Contract(ALGEBRA_POSITION_MANAGER, ALGEBRA_ABI, provider);
        const signerAddress = await signer.getAddress();

        // ✅ Fetch the number of NFTs owned by the user
        const balance = await positionManager.balanceOf(signerAddress);
        const tokenIds = [];

        for (let i = 0; i < balance; i++) {
            const tokenId = await positionManager.tokenOfOwnerByIndex(signerAddress, i);
            tokenIds.push(tokenId.toString());
        }

        console.log("✅ Fetched LP Token IDs:", tokenIds);

        // ✅ Fetch NFT metadata for visualization
        const nftData = await Promise.all(tokenIds.map(getNFTData));

        nftData.forEach((nft, index) => {
            if (nft) {
                displayNFT(`lp-nft-${index}`, nft.image, `lp-nft-${index}`);
            }
        });

        setTimeout(positionNFTs, 1000);

    } catch (error) {
        console.error("❌ Error fetching real LP NFTs:", error);
    }
}

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

async function checkLiquidity() {
    console.log("Checking liquidity...");

    // Assuming you have an array of token positions
    for (let token of tokenPositions) {
        const tokenData = await getTokenInfo(token.id); // Fetch existing token info function


    }
}

// ✅ Wait for Page Load
document.addEventListener("DOMContentLoaded", async function () {
    await initializeProvider();
    await loadABIs();

    await initializeLPLockContract();

    await checkIfOwner();

    await checkTokens();

    // ✅ Load NFTs
    await loadLiquidityNFTs();

    // ✅ Fetch Current Price
    await getCurrentTick();



    document.getElementById("sponsor-btn").addEventListener("click", openSponsorModal);
    document.getElementById("sponsor-submit").addEventListener("click", async () => {
        const amount = document.getElementById("sponsor-amount").value;
        const note = document.getElementById("sponsor-note").value;
        await depositRewards(amount, note);
        closeSponsorModal();
    });



    setInterval(getCurrentTick, 30000);
});
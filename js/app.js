let provider, signer;

const ALGEBRA_POSITION_MANAGER = "0x8eF88E4c7CfbbaC1C163f7eddd4B578792201de6";
const POOL_CONTRACT_ADDRESS = "0xf1a9a6a83077b73f662211b3fdecfa0cf13ceec7";
const LPLOCK_CONTRACT_ADDRESS = "0x9647Ea538f644deE342b0a9cB5D9C6F66e2AfB6e";//"0x432c8e225699a720584477A11138e87E72141395";//"0x13123fcbc2AE4f5C8315B4471ad9cDf9B7e0f59c"; //"0x168555CaA6731601E566E2b52C95B9CA247597dD"; //9th '0x3FC0A0ABd1b895D26fE6404B5332Ffc5e4796705'; //8th "0x43589D96FbA538570bDD0d1500bC09C9ee070194";//7th "0x52D60b724Cd1515BdD6B5c94472e118b9d954c58"; // 6th "0x3465Fd98C2572febdc0c4EAF9Ad0f9878349A2D1";//5th deployment "0x56643F2A8C75486C9521Ba6A985EdE92a5E36D27";// 4th deployment on polygon; "0x9769e8A1eD9731454C1C7b1E6dD0c327aD77545b" // third deployment on polygon // second deployment 1531 05Feb2025 on Polygon: 0x5be0F70e61B6842c126c17250F9f454103B72710 //first deployed 0435 05Feb2025 on polygon: 0x04A0d39e9E60981702B0F36d10F673943982369B
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


// ✅ Load and Display NFTs in Two Bowls
async function loadLiquidityNFTs() {
    try {
        console.log("📡 Loading whitelisted LP NFTs...");
        const nftData = await getWhitelistedNFTs();

        if (nftData.length === 0) {
            console.warn("⚠️ No whitelisted NFTs found.");
            return;
        }

        const nftMetadata = await Promise.all(nftData.map(nft => getNFTData(nft.tokenId)));

        nftMetadata.forEach((nft, index) => {
            if (nft) {
                console.log(`✅ Displaying NFT ${nftData[index].tokenId} in bowl...`);
                displayNFT(nft.image, nftData[index].type);
            }
        });

        setTimeout(positionNFTs, 1000);
    } catch (error) {
        console.error("❌ Error fetching whitelisted LP NFTs:", error);
    }
}

// ✅ Display NFT at Correct Position in the Bowl
function displayNFT(imageUrl, type) {
    const imgElement = document.createElement("img");
    imgElement.src = imageUrl;
    imgElement.alt = "Liquidity NFT";
    imgElement.classList.add("liquidity-nft");

    if (type === "targeted") {
        imgElement.classList.add("targeted-range-nft");
        const container = document.querySelector("#innerLpNFTs");
        if (!container) {
            console.error("❌ Targeted NFT container not found.");
            return;
        }
        container.appendChild(imgElement);
    } else {
        imgElement.classList.add("broad-range-nft");
        const container = document.querySelector("#outerLpNFTs");
        if (!container) {
            console.error("❌ Broad NFT container not found.");
            return;
        }
        container.appendChild(imgElement);
    }
}

function positionNFTs() {
    const outerContainer = document.querySelector("#outerLpNFTs");
    const innerContainer = document.querySelector("#innerLpNFTs");

    if (!outerContainer || !innerContainer) {
        console.error("❌ Missing NFT containers.");
        return;
    }

    const outerRect = outerContainer.getBoundingClientRect();
    const innerRect = innerContainer.getBoundingClientRect();

    const centerX = outerRect.width / 2;
    const baseYOuter = outerRect.height + 80;  // Bottom of outer bowl
    const baseYInner = innerRect.height - 35;  // Bottom of inner bowl

    const broadNFTs = document.querySelectorAll(".broad-range-nft");
    const targetedNFTs = document.querySelectorAll(".targeted-range-nft");

    const totalSets = Math.max(broadNFTs.length, targetedNFTs.length);
    if (totalSets === 0) {
        console.warn("⚠️ No NFTs found.");
        return;
    }

    console.log(`📍 Positioning ${totalSets} sets of NFTs...`);

    const broadArcSpread = 0.24;  // Adjusted arc spread for outer NFTs
    const targetedArcSpread = 0.17;  // Adjusted arc spread for inner NFTs

    const broadRadius = outerRect.height * 0.9; // Outer arc radius
    const targetedRadius = innerRect.height * 0.6; // Inner arc radius (closer grouping)

    for (let i = 0; i < totalSets; i++) {
        const broadAngle = totalSets === 1 
            ? Math.PI / 2 
            : (Math.PI / 2 - broadArcSpread / 2) + (broadArcSpread * i / (totalSets - 1));

        const targetedAngle = totalSets === 1
            ? Math.PI / 2
            : (Math.PI / 2 - targetedArcSpread / 2) + (targetedArcSpread * i / (totalSets - 1));

        // Calculate rotation angles and correct flipping on the left side
        let broadRotation = Math.atan2(-Math.cos(broadAngle), Math.sin(broadAngle)) * (180 / Math.PI);

        let targetedRotation = Math.atan2(-Math.cos(targetedAngle), Math.sin(targetedAngle)) * (180 / Math.PI);

        // Position Broad NFT (Outer Arc)
        if (broadNFTs[i]) {
            const x = centerX + broadRadius * Math.cos(broadAngle);
            const y = (baseYOuter - broadRadius) + broadRadius * Math.sin(broadAngle);

            broadNFTs[i].style.left = `${x}px`;
            broadNFTs[i].style.top = `${y}px`;
            broadNFTs[i].style.transform = `translate(-50%, -50%) rotate(${broadRotation}deg)`;
            broadNFTs[i].style.width = "75px";
            broadNFTs[i].style.zIndex = "10";
        }

        // Position Targeted NFT (Inner Arc)
        if (targetedNFTs[i]) {
            const x = centerX + targetedRadius * Math.cos(targetedAngle);
            const y = (baseYInner - targetedRadius) + targetedRadius * Math.sin(targetedAngle);

            targetedNFTs[i].style.left = `${x}px`;
            targetedNFTs[i].style.top = `${y}px`;
            targetedNFTs[i].style.transform = `translate(-50%, -50%) rotate(${targetedRotation}deg)`;
            targetedNFTs[i].style.width = "35px";
            targetedNFTs[i].style.zIndex = "15";
        }
    }

    console.log("✅ `positionNFTs()` aligned and **correctly tilted** NFTs along the arc.");
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

async function getWhitelistedNFTs() {
    try {
        console.log("📡 Fetching whitelisted NFT IDs from `students` mapping...");

        // Initialize contract
        const contract = new ethers.Contract(LPLOCK_CONTRACT_ADDRESS, LPLOCK_ABI, provider);

        // Get whitelisted addresses
        const whitelistedAddresses = [];
        let totalLockedLP = await contract.totalLockedLP();

        for (let i = 0; i < totalLockedLP; i++) {
            const address = await contract.whitelistedAddresses(i);
            whitelistedAddresses.push(address);
        }

        console.log(`✅ Found ${whitelistedAddresses.length} whitelisted users.`);

        // Fetch all locked NFT data
        let nftData = [];

        for (let address of whitelistedAddresses) {
            const studentInfo = await contract.students(address);
            
            if (studentInfo.broadTokenId > 0) {
                nftData.push({
                    tokenId: studentInfo.broadTokenId.toString(),
                    type: "broad"
                });
                console.log(`🔒 Broad NFT locked by ${address}:`, studentInfo.broadTokenId.toString());
            }
            if (studentInfo.targetedTokenId > 0) {
                nftData.push({
                    tokenId: studentInfo.targetedTokenId.toString(),
                    type: "targeted"
                });
                console.log(`🔒 Targeted NFT locked by ${address}:`, studentInfo.targetedTokenId.toString());
            }
        }

        console.log(`✅ Found ${nftData.length} locked NFTs:`, nftData);
        return nftData; // ✅ Return array of objects with `tokenId` and `type`
    } catch (error) {
        console.error("❌ Error fetching whitelisted NFTs from students mapping:", error);
        return [];
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

    // position NFTs
    positionNFTs();

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
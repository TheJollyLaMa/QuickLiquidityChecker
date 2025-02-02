async function getLpNftImage(tokenId, imgElementId) {
    try {
        const contract = await getContract();
        const tokenUri = await contract.tokenURI(tokenId);

        const response = await fetch(tokenUri);
        if (!response.ok) throw new Error("Failed to fetch metadata");

        const metadata = await response.json();
        document.getElementById(imgElementId).src = metadata.image;

        console.log(`✅ LP NFT Image Loaded for Token ID ${tokenId}:`, metadata.image);
    } catch (error) {
        console.error(`❌ Error fetching LP NFT image for Token ID ${tokenId}:`, error);
        document.getElementById(imgElementId).src = "assets/placeholder.png"; // Fallback Image
    }
}

// Load Preloaded Seed Liquidity NFTs
document.addEventListener("DOMContentLoaded", async () => {
    await getLpNftImage(150843, "lpNftImage1");
    await getLpNftImage(150879, "lpNftImage2");

    // Event Listener for User Input Lookup
    document.getElementById("checkToken").addEventListener("click", async () => {
        const tokenIdInfinity = document.getElementById("tokenIdInfinity").value;
        const tokenIdTargeted = document.getElementById("tokenIdTargeted").value;

        if (tokenIdInfinity) {
            await getLpNftImage(tokenIdInfinity, "userLpNftImage");
        }
        if (tokenIdTargeted) {
            await getLpNftImage(tokenIdTargeted, "userLpNftImage");
        }
    });

    // Automatically Load Locked Tokens
    document.getElementById("holdToken").addEventListener("click", async () => {
        const tokenIdInfinity = document.getElementById("tokenIdInfinity").value;
        const tokenIdTargeted = document.getElementById("tokenIdTargeted").value;

        if (tokenIdInfinity) await getLpNftImage(tokenIdInfinity, "userLpNftImage");
        if (tokenIdTargeted) await getLpNftImage(tokenIdTargeted, "userLpNftImage");
    });
});
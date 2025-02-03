async function getLpNftImage(tokenId, imgElementId) {
    try {
        const contract = await getContract("algebra");
        const tokenUri = await contract.tokenURI(tokenId);
        const response = await fetch(tokenUri);
        if (!response.ok) throw new Error("Failed to fetch metadata");

        const metadata = await response.json();
        const imgElement = document.getElementById(imgElementId);
        if (!imgElement) return console.error(`❌ Element ${imgElementId} not found in DOM`);

        imgElement.src = metadata.image;
    } catch (error) {
        console.error(`❌ Error fetching LP NFT image for Token ID ${tokenId}:`, error);
    }
}

// ✅ Load NFT images
document.addEventListener("DOMContentLoaded", async () => {
    await getLpNftImage(150843, "lpNftImage1");
    await getLpNftImage(150879, "lpNftImage2");
});
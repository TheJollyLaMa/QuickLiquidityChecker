// lplockstakeandfarmcontract.js
let LPLockContract;
async function initializeLPLockContract() {
    try {
        LPLockContract = new ethers.Contract(LPLOCK_CONTRACT_ADDRESS, LPLOCK_ABI, signer);
    } catch (error) {
        console.error("❌ Error initializing LPLock contract:", error);
    }
} 

async function depositRewards(amount, note) {
    try {
        // Convert human-readable amount to contract format (18 decimals)
        const formattedAmount = ethers.utils.parseUnits(amount, 18);
        
        // Get approval
        const tokenContract = new ethers.Contract(SHT_CONTRACT_ADDRESS, ERC20_ABI, signer);
        const approvalTx = await tokenContract.approve(LPLOCK_CONTRACT_ADDRESS, formattedAmount);
        await approvalTx.wait();

        // Deposit rewards
        const tx = await LPLockContract.depositRewards(formattedAmount, note);
        await tx.wait();

        alert(`🧞‍♂️Successfully deposited ${amount} SHT!`);
        updateSponsorList(); // Refresh sponsor list after deposit
    } catch (error) {
        console.error("❌ ⚸ Error depositing rewards:", error);
    }
}



async function depositLP(broadTokenId, targetedTokenId, lockDays) {
    try {
        const tx = await LPLockContract.depositLP(broadTokenId, targetedTokenId, lockDays);
        await tx.wait();
        alert("✅ LP successfully deposited!");
    } catch (error) {
        console.error("❌ Error depositing LP:", error);
    }
}

async function withdrawLP() {
    try {
        const tx = await LPLockContract.withdrawLP();
        await tx.wait();
        alert("✅ LP successfully withdrawn!");
    } catch (error) {
        console.error("❌ Error withdrawing LP:", error);
    }
}


async function getTotalRewards() {
    try {
        const totalRewards = await LPLockContract.totalSHTFunded();
        const formattedRewards = ethers.utils.formatUnits(totalRewards, 18);

        const totalRewardsElement = document.getElementById("total-rewards");
        totalRewardsElement.innerHTML = `
            <div class="rewards-display">
                <strong>Total Rewards in Sponsor Pool:</strong><br>
                <a href="https://polygonscan.com/address/${SHT_CONTRACT_ADDRESS}" target="_blank">
                    <div class="token-container">
                        <img src="assets/SHT.png" alt="SHT Token" class="sht-glow">
                        <img src="assets/Polygon.png" alt="Polygon Logo" class="polygon-icon">
                    </div>
                </a>
                <br>
                <div class="rewards-text">
                    <strong>${formattedRewards} SHT</strong>
                </div>
            </div>
        `;

        console.log(`🧞‍♂️ Total Rewards: ${formattedRewards} SHT`);
    } catch (error) {
        console.error("❌ Error fetching total rewards:", error);
    }
}

function openSponsorModal() {
    document.getElementById("sponsor-modal").style.display = "block";
    getTotalRewards();
    updateSponsorList();
}

function closeSponsorModal() {
    document.getElementById("sponsor-modal").style.display = "none";
}


async function updateSponsorList() {
    try {
        const events = await LPLockContract.queryFilter("RewardsFunded", 0, "latest");

        let sponsors = {};
        
        // Aggregate deposits by wallet
        events.forEach(event => {
            const { sponsor, amount } = event.args;
            const readableAmount = Number(ethers.utils.formatUnits(amount, 18));

            if (sponsors[sponsor]) {
                sponsors[sponsor] += readableAmount;
            } else {
                sponsors[sponsor] = readableAmount;
            }
        });

        // Sort by amount and get top 10 sponsors
        let sortedSponsors = Object.entries(sponsors)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        // Generate leaderboard HTML
        const sponsorListElement = document.getElementById("sponsor-list");
        sponsorListElement.innerHTML = "<h3>🏆 Top Sponsors</h3>";

        sortedSponsors.forEach(([wallet, total]) => {
            sponsorListElement.innerHTML += `<p>${wallet.slice(0, 6)}...${wallet.slice(-4)} → <strong>${total.toFixed(2)} SHT</strong></p>`;
        });

    } catch (error) {
        console.error("❌ Error fetching sponsor list:", error);
    }
}

document.getElementById("sponsee-btn").addEventListener("click", openSponseeModal);
document.getElementById("claim-rewards-btn").addEventListener("click", claimRewards);

async function openSponseeModal() {
    const userAddress = await signer.getAddress();
    document.getElementById("connected-wallet").innerText = userAddress;

    // Check if user's NFTs are locked
    const isLocked = await checkLockedNFTs(userAddress);
    document.getElementById("nft-status").innerText = isLocked ? "✅ Your LP NFTs are LOCKED" : "❌ No Locked NFTs";

    if (isLocked) {
        const rewardAmount = await getClaimableRewards(userAddress);
        document.getElementById("claim-amount").innerText = rewardAmount;
    } else {
        document.getElementById("claim-amount").innerText = "NA";
    }

    document.getElementById("sponsee-modal").style.display = "block";
}

async function checkLockedNFTs(userAddress) {
    const student = await LPLockContract.students(userAddress);
    return student.broadTokenId > 0 && student.targetedTokenId > 0;
}

async function getClaimableRewards(userAddress) {
    const dailyReward = await LPLockContract.calculateDailyReward(userAddress);
    const lastClaim = await LPLockContract.lastClaimedTime(userAddress);
    const daysElapsed = Math.floor((Date.now() / 1000 - lastClaim) / 86400);
    return ethers.utils.formatUnits(dailyReward.mul(daysElapsed), 18);
}

async function claimRewards() {
    try {
        const tx = await LPLockContract.claimRewards();
        await tx.wait();
        alert("Rewards Claimed Successfully!");
        openSponseeModal(); // Refresh modal
    } catch (error) {
        console.error("❌ Error claiming rewards:", error);
        alert("Error claiming rewards!");
    }
}

async function updateSponseeList() {
    try {
        const events = await LPLockContract.queryFilter("LPDeposited", 0, "latest");

        let sponsees = {};
        
        // Aggregate deposits by wallet
        events.forEach(event => {
            const { student, broadTokenId, targetedTokenId } = event.args;
            if (!sponsees[student]) {
                sponsees[student] = [];
            }
            sponsees[student].push({ broadTokenId, targetedTokenId });
        });

        // Generate sponsee list HTML
        const sponseeListElement = document.getElementById("sponsee-list");
        sponseeListElement.innerHTML = "<h3>👨‍🎓 Sponsees</h3>";

        for (const [wallet, nfts] of Object.entries(sponsees)) {
            const formattedWallet = `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
            sponseeListElement.innerHTML += `<p>${formattedWallet}</p>`;
            nfts.forEach(nft => {
                sponseeListElement.innerHTML += `<p>Broad NFT: ${nft.broadTokenId}, Targeted NFT: ${nft.targetedTokenId}</p>`;
            });
        }

    } catch (error) {
        console.error("❌ Error fetching sponsee list:", error);
    }
} 

function closeSponseeModal() {
    document.getElementById("sponsee-modal").style.display = "none";
}
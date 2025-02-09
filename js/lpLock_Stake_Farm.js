// lplockstakeandfarmcontract.js
let LPLockContract;
async function initializeLPLockContract() {
    try {
        if (!signer) {
            console.error("❌ Signer is undefined. Waiting for initialization...");
            await initializeProvider();
        }

        if (!signer) {
            throw new Error("❌ Failed to initialize signer.");
        }

        LPLockContract = new ethers.Contract(LPLOCK_CONTRACT_ADDRESS, LPLOCK_ABI, signer);
        console.log("✅ LPLockContract initialized successfully");
    } catch (error) {
        console.error("❌ Error initializing LPLock contract:", error);
    }
}

async function depositRewards(amount, note) {
    try {
        if (!amount || amount <= 0) {
            alert("❌ Enter a valid amount.");
            return;
        }

        const formattedAmount = ethers.utils.parseUnits(amount, 18);
        const tokenContract = new ethers.Contract(SHT_CONTRACT_ADDRESS, ERC20_ABI, signer);
        
        // ✅ Check if approval is needed
        const allowance = await tokenContract.allowance(await signer.getAddress(), LPLOCK_CONTRACT_ADDRESS);
        if (allowance.lt(formattedAmount)) {
            const approvalTx = await tokenContract.approve(LPLOCK_CONTRACT_ADDRESS, formattedAmount);
            await approvalTx.wait();
        }

        const tx = await LPLockContract.depositRewards(formattedAmount, note);
        await tx.wait();

        alert(`🧞‍♂️Successfully deposited ${amount} SHT!`);
        updateSponsorList();
    } catch (error) {
        console.error("❌ ⚸ Error depositing rewards:", error);
    }
}


async function depositLP(broadTokenId, targetedTokenId, lockDays) {
    try {
        const userAddress = await signer.getAddress();
        const studentInfo = await LPLockContract.students(userAddress);

        if (studentInfo.broadTokenId > 0 || studentInfo.targetedTokenId > 0) {
            alert("❌ You already have LP locked!");
            return;
        }

        const tx = await LPLockContract.depositLP(broadTokenId, targetedTokenId, lockDays);
        await tx.wait();
        alert("✅ LP successfully deposited!");
    } catch (error) {
        console.error("❌ Error depositing LP:", error);
    }
}


async function withdrawLP() {
    try {
        const userAddress = await signer.getAddress();
        const studentInfo = await LPLockContract.students(userAddress);
        const currentTime = Math.floor(Date.now() / 1000);

        if (currentTime < studentInfo.unlockTime) {
            alert("❌ Your LP is still locked!");
            return;
        }

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
    const currentTime = Math.floor(Date.now() / 1000);

    return student.broadTokenId > 0 && student.targetedTokenId > 0 && currentTime < student.unlockTime;
}

async function getClaimableRewards(userAddress) {
    const dailyReward = await LPLockContract.calculateDailyReward(userAddress);
    const lastClaim = await LPLockContract.lastClaimedTime(userAddress);
    
    const currentTime = Math.floor(Date.now() / 1000);
    const daysElapsed = lastClaim > 0 ? Math.floor((currentTime - lastClaim) / 86400) : 0;

    return ethers.utils.formatUnits(dailyReward.mul(daysElapsed), 18);
}

async function claimRewards() {
    try {
        const userAddress = await signer.getAddress();
        const claimableRewards = await getClaimableRewards(userAddress);

        if (claimableRewards <= 0) {
            alert("❌ No rewards available!");
            return;
        }

        const tx = await LPLockContract.claimRewards();
        await tx.wait();
        alert("✅ Rewards Claimed Successfully!");
    } catch (error) {
        console.error("❌ Error claiming rewards:", error);
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



async function checkIfOwner() {
    try {
        if (!LPLockContract) {
            console.error("❌ LPLockContract is not initialized.");
            return;
        }

        const owner = await LPLockContract.owner();
        const userAddress = await signer.getAddress();

        if (owner.toLowerCase() === userAddress.toLowerCase()) {
            document.getElementById("admin-panel-btn").style.display = "block";
        }
    } catch (error) {
        console.error("❌ Error checking contract owner:", error);
    }
}

// Open Modal
document.getElementById("admin-panel-btn").addEventListener("click", () => {
    document.getElementById("admin-modal").style.display = "block";
    loadContractFunctions();
});

// Close Modal
function closeAdminModal() {
    document.getElementById("admin-modal").style.display = "none";
}

// Load Contract Functions
async function loadContractFunctions() {
    const container = document.getElementById("contract-functions");
    container.innerHTML = "";

    LPLOCK_ABI.forEach((func) => {
        if (func.type !== "function") return;

        const functionContainer = document.createElement("div");
        functionContainer.classList.add("function-container");

        const button = document.createElement("button");
        button.innerText = func.name;

        const inputs = [];

        func.inputs.forEach((input) => {
            const inputField = document.createElement("input");
            inputField.placeholder = `${input.name} (${input.type})`;
            inputField.dataset.type = input.type;
            functionContainer.appendChild(inputField);
            inputs.push(inputField);
        });

        button.addEventListener("click", async () => {
            const args = inputs.map((input) => {
                if (input.dataset.type.includes("uint")) {
                    return ethers.BigNumber.from(input.value);
                }
                return input.value;
            });
        
            try {
                const result = await LPLockContract[func.name](...args); 
                
                if (func.stateMutability === "view" || func.stateMutability === "pure") {
                    // ✅ Display the result if it's a view function
                    alert(`✅ ${func.name} result: ${result}`);
                    console.log(`✅ ${func.name} result:`, result);
                } else {
                    // ✅ If it's a transaction, wait for confirmation
                    const tx = result;
                    await tx.wait();
                    alert(`✅ ${func.name} executed successfully!`);
                }
            } catch (error) {
                console.error(`❌ Error executing ${func.name}:`, error);
                alert(`❌ Error executing ${func.name}`);
            }
        });

        functionContainer.appendChild(button);
        container.appendChild(functionContainer);
    });
}

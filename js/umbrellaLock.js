// umbrellaLock.js

// Function to fetch LP token details from the contract
async function fetchLPDetails(tokenId) {
    try {
        const response = await fetch(`/api/lp-details?tokenId=${tokenId}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching LP details:", error);
        return null;
    }
}

// Function to check liquidity position eligibility
async function checkLiquidity(walletAddress) {
    try {
        const response = await fetch(`/api/check-liquidity?wallet=${walletAddress}`);
        const positions = await response.json();
        return positions;
    } catch (error) {
        console.error("Error checking liquidity:", error);
        return [];
    }
}

// Function to update UI with LP token info
function updateLPDisplay(lpPositions) {
    const lpContainer = document.getElementById("lp-container");
    lpContainer.innerHTML = "";
    
    lpPositions.forEach(position => {
        const lpElement = document.createElement("div");
        lpElement.classList.add("lp-card");
        lpElement.innerHTML = `
            <div class="lp-details">
                <p>Token ID: ${position.tokenId}</p>
                <p>Liquidity: ${position.liquidity} OMMM</p>
                <p>Range: ${position.lowerTick} - ${position.upperTick}</p>
            </div>
        `;

        if (position.isEligible) {
            lpElement.classList.add("eligible");
            lpElement.addEventListener("click", () => openLockModal(position));
        } else {
            lpElement.classList.add("dimmed");
        }
        
        lpContainer.appendChild(lpElement);
    });
}

// Function to open the lock modal for staking LP tokens
function openLockModal(position) {
    const modal = document.getElementById("lock-modal");
    const modalContent = document.getElementById("modal-content");
    
    modalContent.innerHTML = `
        <h2>Lock LP Token</h2>
        <p>Token ID: ${position.tokenId}</p>
        <p>Liquidity: ${position.liquidity} OMMM</p>
        <p>Range: ${position.lowerTick} - ${position.upperTick}</p>
        <label for="lock-duration">Lock Duration (days):</label>
        <input type="number" id="lock-duration" min="1" max="90" value="30">
        <button onclick="lockLPToken(${position.tokenId})">Lock LP</button>
    `;
    
    modal.style.display = "block";
}

// Function to lock LP token into the contract
async function lockLPToken(tokenId) {
    const duration = document.getElementById("lock-duration").value;
    try {
        const response = await fetch(`/api/lock-lp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tokenId, duration })
        });
        const result = await response.json();
        if (result.success) {
            alert("LP Token locked successfully!");
            document.getElementById("lock-modal").style.display = "none";
            checkLiquidity(walletAddress); // Refresh UI
        } else {
            alert("Failed to lock LP token.");
        }
    } catch (error) {
        console.error("Error locking LP token:", error);
        alert("Error locking LP token.");
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById("lock-modal");
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

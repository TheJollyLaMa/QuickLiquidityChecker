// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IUniswapV3Positions {
    function approve(address to, uint256 tokenId) external;
    function collect(
        address recipient,
        uint256 tokenId,
        uint128 amount0Max,
        uint128 amount1Max
    ) external returns (uint256 amount0, uint256 amount1);
    function positions(uint256 tokenId) external view returns (
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity
    );
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}

contract LP_Lock_Stake_and_Farm is Ownable {
    IERC20 public rewardToken;
    IUniswapV3Positions public positionManager;

    uint256 public totalLockedLP;
    uint256 public totalSHTFunded;
    uint256 public totalRewardsClaimed;

    uint256 public rewardPeriod = 30 days;
    uint256 public minRequiredLiquidity = 100 * 10**18;

    struct TickRange {
        int24 lower;
        int24 upper;
    }

    TickRange public broadRange = TickRange(-887220, 887220);
    TickRange public targetedRange = TickRange(-31140, 780);

    struct Student {
        uint256 broadTokenId;
        uint256 targetedTokenId;
        uint256 unlockTime;
        uint256 rewardMultiplier;
        bool whitelisted;
    }

    struct Sponsor {
        address sponsorAddress;
        uint256 amountFunded;
        string note;
    }

    mapping(address => Student) public students;
    mapping(address => uint256) public lastClaimedTime;
    mapping(uint256 => bool) public whitelistedNFTs;
    address[] public whitelistedAddresses;
    Sponsor[] public sponsors;

    event LPDeposited(address indexed student, uint256 broadTokenId, uint256 targetedTokenId, uint256 lockDays);
    event LPWithdrawn(address indexed student);
    event RewardsClaimed(address indexed student, uint256 amount);
    event RewardsFunded(address indexed sponsor, uint256 amount, string note);
    event TickRangeUpdated(string rangeType, int24 newLowerTick, int24 newUpperTick);
    event LockDurationUpdated(uint256 newDuration);

    constructor(address _positionManager, address _rewardToken) Ownable(msg.sender) {
        positionManager = IUniswapV3Positions(_positionManager);
        rewardToken = IERC20(_rewardToken);
    }

    function updateMinRequiredLiquidity(uint256 _newLiquidity) external onlyOwner {
        minRequiredLiquidity = _newLiquidity;
    }

    function depositRewards(uint256 _amount, string calldata _note) external {
        require(_amount > 0, "Must deposit a positive amount of SHT");
        require(rewardToken.transferFrom(msg.sender, address(this), _amount), "SHT transfer failed");

        totalSHTFunded += _amount;
        sponsors.push(Sponsor(msg.sender, _amount, _note));

        emit RewardsFunded(msg.sender, _amount, _note);
    }

    function isWhitelisted(address _student) public view returns (bool) {
        Student storage student = students[_student];
        return whitelistedNFTs[student.broadTokenId] && whitelistedNFTs[student.targetedTokenId];
    }

    function checkLPType(uint256 tokenId) internal view returns (uint8) {
        (int24 tickLower, int24 tickUpper, uint128 liquidity) = positionManager.positions(tokenId);
        
        if (liquidity < minRequiredLiquidity) return 0;

        if (tickLower >= broadRange.lower && tickUpper <= broadRange.upper) return 1;
        if (tickLower >= targetedRange.lower && tickUpper <= targetedRange.upper) return 2;

        return 0;
    }

    function depositLP(uint256 broadTokenId, uint256 targetedTokenId, uint256 lockDays) external {
        require(checkLPType(broadTokenId) == 1, "Invalid Broad LP");
        require(checkLPType(targetedTokenId) == 2, "Invalid Targeted LP");
        require(lockDays >= 1 days && lockDays <= 90 days, "Lock period must be between 1 and 90 days");

        uint256 multiplier = getMultiplier(lockDays);

        // Approve the contract to handle the NFTs (if necessary, should be done on the frontend)
        positionManager.approve(address(this), broadTokenId);
        positionManager.approve(address(this), targetedTokenId);

        // Transfer the NFTs to the contract
        positionManager.safeTransferFrom(msg.sender, address(this), broadTokenId);
        positionManager.safeTransferFrom(msg.sender, address(this), targetedTokenId);

        students[msg.sender] = Student(broadTokenId, targetedTokenId, block.timestamp + lockDays, multiplier, true);
        whitelistedNFTs[broadTokenId] = true;
        whitelistedNFTs[targetedTokenId] = true;
        whitelistedAddresses.push(msg.sender);
        totalLockedLP++;

        lastClaimedTime[msg.sender] = block.timestamp;

        emit LPDeposited(msg.sender, broadTokenId, targetedTokenId, lockDays);
    }

    function withdrawLP() external {
        Student storage student = students[msg.sender];
        require(block.timestamp >= student.unlockTime, "LP is still locked");

        // Transfer LP NFTs back to the user
        positionManager.safeTransferFrom(address(this), msg.sender, student.broadTokenId);
        positionManager.safeTransferFrom(address(this), msg.sender, student.targetedTokenId);

        whitelistedNFTs[student.broadTokenId] = false;
        whitelistedNFTs[student.targetedTokenId] = false;

        delete students[msg.sender];

        for (uint256 i = 0; i < whitelistedAddresses.length; i++) {
            if (whitelistedAddresses[i] == msg.sender) {
                whitelistedAddresses[i] = whitelistedAddresses[whitelistedAddresses.length - 1];
                whitelistedAddresses.pop();
                break;
            }
        }

        totalLockedLP--;
        emit LPWithdrawn(msg.sender);
    }

    function calculateDailyReward(address _student) public view returns (uint256) {
        if (!isWhitelisted(_student) || totalLockedLP == 0) return 0;

        uint256 baseReward = totalSHTFunded / (totalLockedLP * rewardPeriod);
        return (baseReward * students[_student].rewardMultiplier) / 100;
    }

    function getMultiplier(uint256 lockDays) public view returns (uint256) {
        if (lockDays >= rewardPeriod) return 200;
        if (lockDays >= (rewardPeriod * 2) / 3) return 166;
        if (lockDays >= rewardPeriod / 3) return 133;
        return 100;
    }

    function claimRewards() external {
        require(isWhitelisted(msg.sender), "Not eligible for rewards");

        uint256 reward = calculateDailyReward(msg.sender) * ((block.timestamp - lastClaimedTime[msg.sender]) / 1 days);
        require(reward > 0, "No rewards available");

        lastClaimedTime[msg.sender] = block.timestamp;
        totalSHTFunded -= reward;
        totalRewardsClaimed += reward;

        require(rewardToken.transfer(msg.sender, reward), "Reward transfer failed");
        emit RewardsClaimed(msg.sender, reward);
    }

    function updateRewardPeriod(uint256 _newPeriod) external onlyOwner {
        require(_newPeriod >= 0 days && _newPeriod <= 365 days, "Invalid period");
        rewardPeriod = _newPeriod;
        emit LockDurationUpdated(_newPeriod);
    }

    function updateBroadRangeTicks(int24 _newLowerTick, int24 _newUpperTick) external onlyOwner {
        require(_newLowerTick < _newUpperTick, "Invalid tick range");
        broadRange = TickRange(_newLowerTick, _newUpperTick);
        emit TickRangeUpdated("BroadRange", _newLowerTick, _newUpperTick);
    }

    function updateTargetedRangeTicks(int24 _newLowerTick, int24 _newUpperTick) external onlyOwner {
        require(_newLowerTick < _newUpperTick, "Invalid tick range");
        targetedRange = TickRange(_newLowerTick, _newUpperTick);
        emit TickRangeUpdated("TargetedRange", _newLowerTick, _newUpperTick);
    }

    function getAllSponsors() external view returns (Sponsor[] memory) {
        return sponsors;
    }
    
}
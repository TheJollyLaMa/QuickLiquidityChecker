// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "@aave/core-v3/contracts/interfaces/IPool.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "@aave/core-v3/contracts/flashloan/interfaces/IFlashLoanSimpleReceiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

event FlashLoanExecuted(bytes params);

abstract contract SimpleFlashLoan is IFlashLoanSimpleReceiver, Ownable {
    address public AAVE_POOL;
    address public TOKEN;
    address public USD;
    
    IPoolAddressesProvider public addressesProvider;
    ISwapRouter public swapRouter;

    constructor(
        address _aavePool,
        address _addressesProvider,
        address _token,
        address _usd,
        address _swapRouter
    ) Ownable(msg.sender) {
        AAVE_POOL = _aavePool;
        addressesProvider = IPoolAddressesProvider(_addressesProvider);
        TOKEN = _token;
        USD = _usd;
        swapRouter = ISwapRouter(_swapRouter);
    }

    function ADDRESSES_PROVIDER() external view override returns (IPoolAddressesProvider) {
        return addressesProvider;
    }

    function POOL() external view override returns (IPool) {
        return IPool(AAVE_POOL);
    }

    function executeFlashLoan(uint256 amount, uint8 strategy) external onlyOwner {
        address[] memory assets = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        uint256[] memory modes = new uint256[](1);

        assets[0] = TOKEN;
        amounts[0] = amount;
        modes[0] = 0; // No debt, repay in full

        bytes memory params = abi.encode(strategy);
        IPool(AAVE_POOL).flashLoan(
            address(this),
            assets,
            amounts,
            modes,
            address(this),
            params,
            0
        );
    }

    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external returns (bool) {
        require(msg.sender == AAVE_POOL, "Not AAVE pool");
        require(initiator == address(this), "Unauthorized initiator");

        address borrowedAsset = assets[0]; // Use the actual borrowed asset
        uint256 loanAmount = amounts[0];
        uint256 repaymentAmount = loanAmount + premiums[0];

        // Swap borrowed asset for USD on Uniswap V3
        IERC20(borrowedAsset).approve(address(swapRouter), loanAmount);
        
        ISwapRouter.ExactInputSingleParams memory params1 = ISwapRouter.ExactInputSingleParams({
            tokenIn: borrowedAsset,
            tokenOut: USD,
            fee: 3000, // 0.3% pool fee
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: loanAmount,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        });

        uint256 usdBalance = swapRouter.exactInputSingle(params1);

        // Swap USD back to borrowed asset on Uniswap V3
        IERC20(USD).approve(address(swapRouter), usdBalance);
        
        ISwapRouter.ExactInputSingleParams memory params2 = ISwapRouter.ExactInputSingleParams({
            tokenIn: USD,
            tokenOut: borrowedAsset,
            fee: 3000,
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: usdBalance,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        });

        uint256 finalBalance = swapRouter.exactInputSingle(params2);

        // Repay flash loan
        IERC20(borrowedAsset).approve(AAVE_POOL, repaymentAmount);
        uint256 profit = finalBalance - repaymentAmount;
        // Transfer profit to owner
        if (profit > 0) {
            IERC20(borrowedAsset).transfer(owner(), profit);
        }
        emit FlashLoanExecuted(params);
        return true;
    }
        function updateAavePool(address _newAavePool) external onlyOwner {
        AAVE_POOL = _newAavePool;
    }

    function updateAddressesProvider(address _newAddressesProvider) external onlyOwner {
        addressesProvider = IPoolAddressesProvider(_newAddressesProvider);
    }

    function updateTOKEN(address _newTOKEN) external onlyOwner {
        TOKEN = _newTOKEN;
    }

    function updateUSD(address _newUSD) external onlyOwner {
        USD = _newUSD;
    }

    function updateSwapRouter(address _newSwapRouter) external onlyOwner {
        swapRouter = ISwapRouter(_newSwapRouter);
    }
}
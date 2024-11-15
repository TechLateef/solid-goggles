// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20 {
    uint8 private _decimals;
        address public owner;


    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals, 
        uint256 _initialSupply
    ) ERC20(_name, _symbol) { // Pass _name and _symbol to ERC20 constructor
        _decimals = _decimals; // Store custom decimals
        owner = msg.sender;
        _mint(msg.sender, _initialSupply * 10 ** _decimals); // Mint initial supply with decimals applied
    }

    // Override the decimals function
    function decimals() public view override returns (uint8) {
        return _decimals;
    }

       modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can mint");
        _;
    }

    function mint(address to, uint256 amount) external onlyOwner() {
        _mint(to, amount);
    }

  
}
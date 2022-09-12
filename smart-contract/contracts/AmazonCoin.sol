// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract AmazonCoin is ERC20, Ownable {
    constructor() ERC20("Blockmetacity", "BMC") {
         _mint(msg.sender, 100000000000 * 10 ** decimals());
    }

    function mint(uint256 amount) public payable {
        require(msg.value == amount * 0.0001 ether, "invalid amount of ether");
        _mint(msg.sender, amount);
    } 
    receive() external payable{}
    fallback() external payable{}
}
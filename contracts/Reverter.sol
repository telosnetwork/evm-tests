// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract Reverter {

    function revertWithMessage() public {
        require(false, "This is a very big problem!");
    }

    function testValueTransfer(address sender) public payable {
        payable(sender).transfer(msg.value);
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract Reverter {

    function revertWithMessage() public {
        require(false, "This is a very big problem!");
    }

    function testValueTransfer(address payable sender) public payable {
        sender.transfer(msg.value);
    }

    function testGasLeft() public returns (uint gasLeft)  {
        gasLeft = gasleft();
        return gasLeft;
    }
}
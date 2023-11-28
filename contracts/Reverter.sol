// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract Reverter {

    function revertWithMessage() public pure {
        require(false, "This is a very big problem!");
    }

    function testValueTransfer(address payable sender) public payable {
        sender.transfer(msg.value);
    }
    function revertNoReason() public {
        require(false);
    }
    function testGasLeft() public returns (uint gasLeft)  {
        gasLeft = gasleft();
        return gasLeft;
    }
}
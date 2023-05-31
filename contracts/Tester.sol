// contracts/Tester.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./Reverter.sol";

contract Tester {

    Reverter public reverter;

    constructor(Reverter _reverter) {
        reverter = _reverter;
    }

    function testCallRevert() public {
        reverter.revertWithMessage();
    }

    function testValueTransfer() public payable {
        // First send the TLOS back to sender to test internal value transactions
        payable(msg.sender).transfer(msg.value);
    }

}

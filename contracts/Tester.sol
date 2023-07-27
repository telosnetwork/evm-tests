// contracts/Tester.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./Reverter.sol";

contract Tester {

    Reverter public reverter;

    constructor(Reverter _reverter) {
        reverter = _reverter;
    }

    receive() external payable {}

    function testCallNonRevert() public {
        (bool success, bytes memory returndata) = address(reverter).call(abi.encodeWithSignature('revertWithMessage()'));
    }

    function testCallRevert() public {
        reverter.revertWithMessage();
    }

    function testProxiedValueTransfer() public payable {
        reverter.testValueTransfer{value: msg.value}(msg.sender);
    }

    function testValueTransfer() public payable {
        // First send the TLOS back to sender to test internal value transactions
        payable(msg.sender).transfer(msg.value);
    }

    function create(uint rand) public payable returns (address newReverter) {
        bytes memory bytecode = type(Reverter).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(rand));
        assembly {
            newReverter := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        reverter = Reverter(newReverter);
        return newReverter;
    }
}
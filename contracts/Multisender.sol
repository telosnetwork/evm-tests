// SPDX-License-Identifier: MIT
pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;


library SafeMath {
    /**
    * @dev Multiplies two numbers, throws on overflow.
    */
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) {
            return 0;
        }
        uint256 c = a * b;
        assert(c / a == b);
        return c;
    }

    /**
    * @dev Integer division of two numbers, truncating the quotient.
    */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b > 0); // Solidity automatically throws when dividing by 0
        uint256 c = a / b;
        return c;
    }

    /**
    * @dev Subtracts two numbers, throws on overflow (i.e. if subtrahend is greater than minuend).
    */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        require(b <= a);
        uint256 c = a - b;
        return c;
    }

    /**
    * @dev Adds two numbers, throws on overflow.
    */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a);
        return c;
    }
}

contract Multisender {
    using SafeMath for uint256;
    struct Recipient {
        address payable recipient;
        uint256 balance;
    }

    mapping(bytes32 => uint256) internal uintStorage;
    
    constructor() public  {
        uintStorage[keccak256("fee")] = 0.01 ether;
    }

    function fee() public view returns (uint256) {
        return uintStorage[keccak256("fee")];
    }


    function validateEther(Recipient[] calldata _recipients) external payable returns (uint gasLeft, Recipient[] memory badAddresses)  {
        badAddresses = new Recipient[](_recipients.length);

        require(
            address(this).balance >= msg.value,
            "do not try to take the contract money"
        );
        uint256 total = msg.value;
        uint256 contractFee = fee();

        for (uint256 i = 0; i < _recipients.length; i++) {
            bool success = _recipients[i].recipient.send(_recipients[i].balance);
            if (!success) {
                badAddresses[i] = _recipients[i];
            } 
        }
        gasLeft = gasleft();
    }
}
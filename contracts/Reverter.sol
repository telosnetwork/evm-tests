pragma solidity ^0.8.0;

contract Reverter {
    function revertWithMessage() public {
        require(false, "This is a very big problem!");
    }
}

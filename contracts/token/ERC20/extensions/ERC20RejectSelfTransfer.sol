// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {ERC20} from "../ERC20.sol";

abstract contract ERC20RejectSelfTransfer is ERC20 {
    error ERC20SelfTransfer();

    function _update(address, address to, uint256) internal virtual override {
        if (to == address(this)) {
            revert ERC20SelfTransfer();
        }
    }
}

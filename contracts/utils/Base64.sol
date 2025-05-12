// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (utils/Base64.sol)

pragma solidity ^0.8.20;

/**
 * @dev Provides a set of functions to operate with Base64 strings.
 */
library Base64 {
    /**
     * @dev Base64 Encoding/Decoding Table
     * See sections 4 and 5 of https://datatracker.ietf.org/doc/html/rfc4648
     */
    string internal constant _TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    string internal constant _TABLE_URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

    /**
     * @dev Converts a `bytes` to its Bytes64 `string` representation.
     */
    function encode(bytes memory data) internal pure returns (string memory) {
        return _encode(data, _TABLE, true);
    }

    /**
     * @dev Converts a `bytes` to its Bytes64Url `string` representation.
     * Output is not padded with `=` as specified in https://www.rfc-editor.org/rfc/rfc4648[rfc4648].
     */
    function encodeURL(bytes memory data) internal pure returns (string memory) {
        return _encode(data, _TABLE_URL, false);
    }

    function decode(string memory data) internal pure returns (bytes memory) {
        return _decode(data);
    }

    /**
     * @dev Internal table-agnostic conversion
     */
    function _encode(bytes memory data, string memory table, bool withPadding) private pure returns (string memory) {
        /**
         * Inspired by Brecht Devos (Brechtpd) implementation - MIT licence
         * https://github.com/Brechtpd/base64/blob/e78d9fd951e7b0977ddca77d92dc85183770daf4/base64.sol
         */
        if (data.length == 0) return "";

        // If padding is enabled, the final length should be `bytes` data length divided by 3 rounded up and then
        // multiplied by 4 so that it leaves room for padding the last chunk
        // - `data.length + 2`  -> Prepare for division rounding up
        // - `/ 3`              -> Number of 3-bytes chunks (rounded up)
        // - `4 *`              -> 4 characters for each chunk
        // This is equivalent to: 4 * Math.ceil(data.length / 3)
        //
        // If padding is disabled, the final length should be `bytes` data length multiplied by 4/3 rounded up as
        // opposed to when padding is required to fill the last chunk.
        // - `4 * data.length`  -> 4 characters for each chunk
        // - ` + 2`             -> Prepare for division rounding up
        // - `/ 3`              -> Number of 3-bytes chunks (rounded up)
        // This is equivalent to: Math.ceil((4 * data.length) / 3)
        uint256 resultLength = withPadding ? 4 * ((data.length + 2) / 3) : (4 * data.length + 2) / 3;

        string memory result = new string(resultLength);

        assembly ("memory-safe") {
            // Prepare the lookup table (skip the first "length" byte)
            let tablePtr := add(table, 1)

            // Prepare result pointer, jump over length
            let resultPtr := add(result, 0x20)
            let dataPtr := data
            let endPtr := add(data, mload(data))

            // In some cases, the last iteration will read bytes after the end of the data. We cache the value, and
            // set it to zero to make sure no dirty bytes are read in that section.
            let afterPtr := add(endPtr, 0x20)
            let afterCache := mload(afterPtr)
            mstore(afterPtr, 0x00)

            // Run over the input, 3 bytes at a time
            for {} lt(dataPtr, endPtr) {} {
                // Advance 3 bytes
                dataPtr := add(dataPtr, 3)
                let input := mload(dataPtr)

                // To write each character, shift the 3 byte (24 bits) chunk
                // 4 times in blocks of 6 bits for each character (18, 12, 6, 0)
                // and apply logical AND with 0x3F to bitmask the least significant 6 bits.
                // Use this as an index into the lookup table, mload an entire word
                // so the desired character is in the least significant byte, and
                // mstore8 this least significant byte into the result and continue.

                mstore8(resultPtr, mload(add(tablePtr, and(shr(18, input), 0x3F))))
                resultPtr := add(resultPtr, 1) // Advance

                mstore8(resultPtr, mload(add(tablePtr, and(shr(12, input), 0x3F))))
                resultPtr := add(resultPtr, 1) // Advance

                mstore8(resultPtr, mload(add(tablePtr, and(shr(6, input), 0x3F))))
                resultPtr := add(resultPtr, 1) // Advance

                mstore8(resultPtr, mload(add(tablePtr, and(input, 0x3F))))
                resultPtr := add(resultPtr, 1) // Advance
            }

            // Reset the value that was cached
            mstore(afterPtr, afterCache)

            if withPadding {
                // When data `bytes` is not exactly 3 bytes long
                // it is padded with `=` characters at the end
                switch mod(mload(data), 3)
                case 1 {
                    mstore8(sub(resultPtr, 1), 0x3d)
                    mstore8(sub(resultPtr, 2), 0x3d)
                }
                case 2 {
                    mstore8(sub(resultPtr, 1), 0x3d)
                }
            }
        }

        return result;
    }

    function _decode(string memory data) private pure returns (bytes memory) {
        bytes memory res = new bytes((bytes(data).length * 3) / 4);

        uint256 dataPointer;
        uint256 resPointer;
        assembly ("memory-safe") {
            dataPointer := add(data, 0x20)
            resPointer := add(res, 0x20)
        }

        // Base64 chars are 6 bits each. Iterate over 4 at a time to have 3 bytes.
        for (uint256 i = 0; i < (bytes(data).length) / 4; i++) {
            uint8 a;
            uint8 b;
            uint8 c;
            uint8 d;

            assembly ("memory-safe") {
                let slot := mload(add(dataPointer, mul(i, 4)))
                a := shr(248, slot)
                b := shr(240, slot)
                c := shr(232, slot)
                d := shr(224, slot)
            }

            bytes3 vals = bytes3(
                (uint24(_convertBase64CharToIndex(uint8(a))) << 18) |
                    (uint24(_convertBase64CharToIndex(uint8(b))) << 12) |
                    (uint24(_convertBase64CharToIndex(uint8(c))) << 6) |
                    uint24(_convertBase64CharToIndex(uint8(d)))
            );

            assembly ("memory-safe") {
                mstore8(add(resPointer, mul(i, 3)), shr(248, vals))
                mstore8(add(resPointer, add(mul(i, 3), 1)), shr(240, vals))
                mstore8(add(resPointer, add(mul(i, 3), 2)), shr(232, vals))
            }
        }

        return res;
    }

    function _convertBase64CharToIndex(uint8 char) private pure returns (uint8) {
        if (char >= 0x41 && char <= 0x5A) {
            return char - 0x41;
        } else if (char >= 0x61 && char <= 0x7A) {
            return char - 0x47;
        } else if (char >= 0x30 && char <= 0x39) {
            return char + 0x04;
        } else if (char == 0x2B) {
            return 62;
        } else if (char == 0x2F) {
            return 63;
        } else if (char == 0x3D) {
            return 0;
        } else {
            revert("Invalid Base64 character");
        }
    }
}

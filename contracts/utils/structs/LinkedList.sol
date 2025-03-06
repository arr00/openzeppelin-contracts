// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

library LinkedList {
    struct Node {
        uint16 prev;
        uint16 next;
        uint224 val;
    }

    struct Bytes32LinkedList {
        Node[] _elements;
        uint16 _numRemoved;
        uint16 _head;
        uint16 _tail;
    }

    error LinkedListIndexOutOfBounds(uint16 index);

    function insertAt(Bytes32LinkedList storage self, uint16 index, uint224 val) internal {
        uint16 size = length(self);
        if (index > size) {
            revert LinkedListIndexOutOfBounds(index);
        }

        if (index > size / 2) {
            _insertBackward(self, index, val, size);
        } else {
            _insertForward(self, index, val, size);
        }
    }

    function _insertForward(Bytes32LinkedList storage self, uint16 index, uint224 val, uint16 size) private {
        uint16 pointer = uint16(self._elements.length);
        uint16 prev = 0;
        uint16 next = self._head;
        uint16 currentIndex = 0;

        while (currentIndex < index) {
            prev = next;
            next = self._elements[prev].next;
            currentIndex++;
        }

        self._elements.push(Node(prev, next, val));

        if (index == 0) {
            self._head = pointer;
        } else {
            self._elements[prev].next = pointer;
        }

        if (index == size) {
            self._tail = pointer;
            return;
        }
        self._elements[next].prev = pointer;
    }

    function _insertBackward(Bytes32LinkedList storage self, uint16 index, uint224 val, uint16 length_) private {
        uint16 pointer = uint16(self._elements.length);
        uint16 prev = self._tail;
        uint16 next = 0;
        uint16 currentIndex = length_;

        while (currentIndex > index) {
            next = prev;
            prev = self._elements[next].prev;
            currentIndex--;
        }

        self._elements.push(Node(prev, next, val));
        self._elements[prev].next = pointer;

        if (index == length_) {
            self._tail = pointer;
            return;
        }

        self._elements[next].prev = pointer;
    }

    function push(Bytes32LinkedList storage self, uint224 val) internal {
        insertAt(self, length(self), val);
    }

    function removeAt(Bytes32LinkedList storage self, uint16 index) internal {
        uint16 length_ = length(self);

        if (index >= length_) {
            revert LinkedListIndexOutOfBounds(index);
        }

        if (index > length_ / 2) {
            _removeBackward(self, index, length_);
        } else {
            _removeForward(self, index, length_);
        }
        self._numRemoved++;
    }

    function pop(Bytes32LinkedList storage self) internal {
        removeAt(self, length(self) - 1);
    }

    function _removeForward(Bytes32LinkedList storage self, uint16 index, uint16 length_) private {
        uint16 prev = 0;
        uint16 next = self._elements[self._head].next;
        uint16 currentIndex = 0;
        uint16 node = self._head;

        while (currentIndex < index) {
            prev = node;
            node = next;
            next = self._elements[next].next;
            currentIndex++;
        }

        if (index == 0) {
            self._head = next;
        }

        if (index == length_ - 1) {
            self._tail = prev;
        }

        self._elements[prev].next = next;
        self._elements[next].prev = prev;
        delete self._elements[node];
    }

    function _removeBackward(Bytes32LinkedList storage self, uint16 index, uint16 length_) private {
        uint16 prev = self._elements[self._tail].prev;
        uint16 next = 0;
        uint16 currentIndex = length_ - 1;
        uint16 node = self._tail;

        while (currentIndex > index) {
            next = node;
            node = prev;
            prev = self._elements[prev].prev;
            currentIndex--;
        }

        if (index == length_ - 1) {
            self._tail = prev;
        }

        self._elements[prev].next = next;
        self._elements[next].prev = prev;
        delete self._elements[node];
    }

    function peek(Bytes32LinkedList storage self) internal view returns (uint224) {
        return self._elements[self._tail].val;
    }

    function values(Bytes32LinkedList storage self) internal view returns (uint224[] memory) {
        uint16 length_ = length(self);
        uint224[] memory result = new uint224[](length_);
        uint16 next = self._head;

        for (uint256 i = 0; i < length_; i++) {
            result[i] = self._elements[next].val;
            next = self._elements[next].next;
        }

        return result;
    }

    function length(Bytes32LinkedList storage self) internal view returns (uint16) {
        return uint16(self._elements.length - self._numRemoved);
    }
}

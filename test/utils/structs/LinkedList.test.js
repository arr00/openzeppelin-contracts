const { ethers } = require('hardhat');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');

async function fixture() {
  const mock = await ethers.deployContract('$LinkedList');
  return { mock };
}

describe.only('LinkedList', function () {
  beforeEach(async function () {
    Object.assign(this, await loadFixture(fixture));
  });

  describe('insert', function () {
    it('into an empty linked list', async function () {
      const vals = [1n, 2n, 3n, 4n, 5n];
      for (const val of vals) {
        await this.mock.$push(0n, val);
      }

      await expect(this.mock.$values(0)).to.eventually.deep.equal(vals);
    });

    describe('into a non-empty linked list', function () {
      beforeEach(async function () {
        this.values = [1n, 3n];
        for (const val of this.values) {
          await this.mock.$push(0n, val);
        }
      });

      it('at the center', async function () {
        await this.mock.$insertAt(0n, 1n, 2n);
        await expect(this.mock.$values(0)).to.eventually.deep.equal(this.values.toSpliced(1, 0, 2n));
      });

      it('at the beginning', async function () {
        await this.mock.$insertAt(0n, 0n, 0n);
        await expect(this.mock.$values(0)).to.eventually.deep.equal(this.values.toSpliced(0, 0, 0n));
      });

      it('at the end', async function () {
        await this.mock.$push(0n, 4n);
        await expect(this.mock.$values(0)).to.eventually.deep.equal(this.values.toSpliced(2, 0, 4n));
      });
    });
  });

  describe('remove', function () {
    it('from an empty linked list', async function () {
      await expect(this.mock.$removeAt(0n, 0n))
        .to.be.revertedWithCustomError(this.mock, 'LinkedListIndexOutOfBounds')
        .withArgs(0n);
    });

    describe('from a non-empty linked list', function () {
      beforeEach(async function () {
        this.values = [1n, 2n, 3n, 4n, 5n];
        for (const val of this.values) {
          await this.mock.$push(0n, val);
        }
      });

      afterEach(async function () {
        await expect(this.mock.$values(0)).to.eventually.deep.equal(this.values);
        await expect(this.mock.$peek(0n)).to.eventually.equal(this.values.pop());
      });

      it('at the center', async function () {
        await this.mock.$removeAt(0n, 2n);
        this.values.splice(2, 1);
      });

      it('at the beginning', async function () {
        await this.mock.$removeAt(0n, 0n);
        this.values.splice(0, 1);
      });

      it('at the end via `removeAt`', async function () {
        await this.mock.$removeAt(0n, 4n);
        this.values.splice(4, 1);
      });

      it('at the end via `pop`', async function () {
        await this.mock.$pop(0n);
        this.values.pop();
      });
    });
  });
});

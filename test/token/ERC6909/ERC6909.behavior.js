const { ethers } = require('hardhat');
const { expect } = require('chai');

const { shouldSupportInterfaces } = require('../../utils/introspection/SupportsInterface.behavior');

function shouldBehaveLikeERC6909() {
  const firstTokenId = 1n;
  const secondTokenId = 2n;
  const randomTokenId = 125523n;

  const firstTokenAmount = 2000n;
  const secondTokenAmount = 3000n;

  beforeEach(async function () {
    [this.recipient, this.proxy, this.alice, this.bruce] = this.otherAccounts;
  });

  describe('like an ERC6909', function () {
    describe('balanceOf', function () {
      describe("when accounts don't own tokens", function () {
        it('return zero', async function () {
          await expect(this.token.balanceOf(this.alice, firstTokenId)).to.eventually.be.equal(0);
          await expect(this.token.balanceOf(this.bruce, secondTokenId)).to.eventually.be.equal(0);
          await expect(this.token.balanceOf(this.alice, randomTokenId)).to.eventually.be.equal(0);
        });
      });

      describe('when accounts own some tokens', function () {
        beforeEach(async function () {
          await this.token.$_mint(this.alice, firstTokenId, firstTokenAmount);
          await this.token.$_mint(this.bruce, secondTokenId, secondTokenAmount);
        });

        it('returns amount owned by the given address', async function () {
          await expect(this.token.balanceOf(this.alice, firstTokenId)).to.eventually.be.equal(firstTokenAmount);
          await expect(this.token.balanceOf(this.bruce, secondTokenId)).to.eventually.be.equal(secondTokenAmount);
          await expect(this.token.balanceOf(this.bruce, firstTokenId)).to.eventually.be.equal(0);
        });
      });
    });

    describe('setOperator', function () {
      it('emits an an OperatorSet event and updated the value', async function () {
        await expect(this.token.connect(this.holder).setOperator(this.operator, true))
          .to.emit(this.token, 'OperatorSet')
          .withArgs(this.holder, this.operator, true);

        // operator for holder
        await expect(this.token.isOperator(this.holder, this.operator)).to.eventually.be.true;

        // not operator for other account
        await expect(this.token.isOperator(this.alice, this.operator)).to.eventually.be.false;
      });

      it('can unset the operator approval', async function () {
        await expect(this.token.connect(this.holder).setOperator(this.operator, false))
          .to.emit(this.token, 'OperatorSet')
          .withArgs(this.holder, this.operator, false);
      });

      it('cannot set address(0) as an operator', async function () {
        await expect(this.token.setOperator(ethers.ZeroAddress, true))
          .to.be.revertedWithCustomError(this.token, 'ERC6909InvalidSpender')
          .withArgs(ethers.ZeroAddress);
      });
    });

    describe('approve', function () {
      it('emits an Approval event and updates allowance', async function () {
        await expect(this.token.connect(this.holder).approve(this.operator, firstTokenId, firstTokenAmount))
          .to.emit(this.token, 'Approval')
          .withArgs(this.holder, this.operator, firstTokenId, firstTokenAmount);

        // approved
        await expect(this.token.allowance(this.holder, this.operator, firstTokenId)).to.eventually.be.equal(
          firstTokenAmount,
        );
        // other account is not approved
        await expect(this.token.allowance(this.alice, this.operator, firstTokenId)).to.eventually.be.equal(0);
      });

      it('can unset the approval', async function () {
        await expect(this.token.connect(this.holder).approve(this.operator, firstTokenId, 0))
          .to.emit(this.token, 'Approval')
          .withArgs(this.holder, this.operator, firstTokenId, 0);
        await expect(this.token.allowance(this.holder, this.operator, firstTokenId)).to.eventually.be.equal(0);
      });

      it('cannot give allowance to address(0)', async function () {
        await expect(this.token.connect(this.holder).approve(ethers.ZeroAddress, firstTokenId, firstTokenAmount))
          .to.be.revertedWithCustomError(this.token, 'ERC6909InvalidSpender')
          .withArgs(ethers.ZeroAddress);
      });
    });

    describe('transfer', function () {
      beforeEach(async function () {
        await this.token.$_mint(this.alice, firstTokenId, firstTokenAmount);
        await this.token.$_mint(this.bruce, secondTokenId, secondTokenAmount);
      });

      it('transfers to the zero address are blocked', async function () {
        await expect(this.token.connect(this.alice).transfer(ethers.ZeroAddress, firstTokenId, firstTokenAmount))
          .to.be.revertedWithCustomError(this.token, 'ERC6909InvalidReceiver')
          .withArgs(ethers.ZeroAddress);
        await expect(this.token.balanceOf(this.alice, firstTokenId)).to.eventually.equal(firstTokenAmount);
      });

      it('reverts when insufficient balance', async function () {
        await expect(this.token.connect(this.alice).transfer(this.bruce, firstTokenId, firstTokenAmount + 1n))
          .to.be.revertedWithCustomError(this.token, 'ERC6909InsufficientBalance')
          .withArgs(this.alice, firstTokenAmount, firstTokenAmount + 1n, firstTokenId);
      });

      it('emits event and transfers tokens', async function () {
        await expect(this.token.connect(this.alice).transfer(this.bruce, firstTokenId, firstTokenAmount))
          .to.emit(this.token, 'Transfer')
          .withArgs(this.alice, this.alice, this.bruce, firstTokenId, firstTokenAmount);
        await expect(this.token.balanceOf(this.alice, firstTokenId)).to.eventually.equal(0);
        await expect(this.token.balanceOf(this.bruce, firstTokenId)).to.eventually.equal(firstTokenAmount);
      });
    });

    describe('transferFrom', function () {
      beforeEach(async function () {
        await this.token.$_mint(this.alice, firstTokenId, firstTokenAmount);
        await this.token.$_mint(this.bruce, secondTokenId, secondTokenAmount);
      });

      it('transfer from self', async function () {
        await expect(
          this.token.connect(this.alice).transferFrom(this.alice, this.bruce, firstTokenId, firstTokenAmount),
        )
          .to.emit(this.token, 'Transfer')
          .withArgs(this.alice, this.alice, this.bruce, firstTokenId, firstTokenAmount);
        await expect(this.token.balanceOf(this.alice, firstTokenId)).to.eventually.equal(0);
        await expect(this.token.balanceOf(this.bruce, firstTokenId)).to.eventually.equal(firstTokenAmount);
      });

      describe('with approval', async function () {
        beforeEach(async function () {
          await this.token.connect(this.alice).approve(this.operator, firstTokenId, firstTokenAmount);
        });

        it('reverts when insufficient allowance', async function () {
          await expect(
            this.token.connect(this.operator).transferFrom(this.alice, this.bruce, firstTokenId, firstTokenAmount + 1n),
          )
            .to.be.revertedWithCustomError(this.token, 'ERC6909InsufficientAllowance')
            .withArgs(this.operator, firstTokenAmount, firstTokenAmount + 1n, firstTokenId);
        });

        it('should emit transfer event and update approval (without an Approval event)', async function () {
          await expect(
            this.token.connect(this.operator).transferFrom(this.alice, this.bruce, firstTokenId, firstTokenAmount),
          )
            .to.emit(this.token, 'Transfer')
            .withArgs(this.operator, this.alice, this.bruce, firstTokenId, firstTokenAmount)
            .to.not.emit(this.token, 'Approval');
          await expect(this.token.allowance(this.alice, this.operator, firstTokenId)).to.eventually.equal(0);
        });

        it("shouldn't reduce allowance when infinite", async function () {
          await this.token.connect(this.bruce).approve(this.operator, secondTokenId, ethers.MaxUint256);
          await this.token
            .connect(this.operator)
            .transferFrom(this.bruce, this.alice, secondTokenId, secondTokenAmount);
          await expect(this.token.allowance(this.bruce, this.operator, secondTokenId)).to.eventually.equal(
            ethers.MaxUint256,
          );
        });
      });
    });

    describe('with operator approval', function () {
      beforeEach(async function () {
        await this.token.connect(this.holder).setOperator(this.operator, true);
        await this.token.$_mint(this.holder, firstTokenId, firstTokenAmount);
      });

      it('operator can transfer', async function () {
        await expect(
          this.token.connect(this.operator).transferFrom(this.holder, this.alice, firstTokenId, firstTokenAmount),
        )
          .to.emit(this.token, 'Transfer')
          .withArgs(this.operator, this.holder, this.alice, firstTokenId, firstTokenAmount);
        await expect(this.token.balanceOf(this.holder, firstTokenId)).to.eventually.equal(0);
        await expect(this.token.balanceOf(this.alice, firstTokenId)).to.eventually.equal(firstTokenAmount);
      });

      it('operator transfer does not reduce allowance', async function () {
        // Also give allowance
        await this.token.connect(this.holder).approve(this.operator, firstTokenId, firstTokenAmount);
        await expect(
          this.token.connect(this.operator).transferFrom(this.holder, this.alice, firstTokenId, firstTokenAmount),
        )
          .to.emit(this.token, 'Transfer')
          .withArgs(this.operator, this.holder, this.alice, firstTokenId, firstTokenAmount);
        await expect(this.token.allowance(this.holder, this.operator, firstTokenId)).to.eventually.equal(
          firstTokenAmount,
        );
      });
    });

    shouldSupportInterfaces(['ERC6909']);
  });
}

module.exports = {
  shouldBehaveLikeERC6909,
};

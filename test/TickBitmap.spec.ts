import { ethers } from 'hardhat'
import { TickBitmapTest } from '../typechain/TickBitmapTest'
import { deploy2, type2 } from './shared/deploy2'
import { expect } from './shared/expect'
import snapshotGasCost from './shared/snapshotGasCost'

describe('TickBitmap', () => {
  let tickBitmap: TickBitmapTest

  beforeEach('deploy TickBitmapTest', async () => {
    const feeData = await ethers.provider.getFeeData();
    const nonce = await ethers.provider.getTransactionCount('0xF113C0c7741E1351A6263c7e8cF693494BCf58F7');

    const tickBitmapTestFactory = await ethers.getContractFactory('TickBitmapTest')
    tickBitmap = (await deploy2(tickBitmapTestFactory)) as TickBitmapTest

    await tickBitmap.deployTransaction.wait(1);
    const nonce2 = await ethers.provider.getTransactionCount('0xF113C0c7741E1351A6263c7e8cF693494BCf58F7');
  })

  async function initTicks(ticks: number[]): Promise<void> {
    for (const tick of ticks) {
      const tx = await tickBitmap.flipTick(tick, await type2())
      await tx.wait();
    }
  }

  describe('#isInitialized', () => {
    it('is false at first', async () => {
      expect(await tickBitmap.isInitialized(1)).to.eq(false)
    })
    it('is flipped by #flipTick', async () => {
      await (await tickBitmap.flipTick(1, await type2())).wait()
      expect(await tickBitmap.isInitialized(1)).to.eq(true)
    })
    it('is flipped back by #flipTick', async () => {
      await tickBitmap.flipTick(1, await type2())
      await (await tickBitmap.flipTick(1, await type2())).wait()
      expect(await tickBitmap.isInitialized(1)).to.eq(false)
    })
    it('is not changed by another flip to a different tick', async () => {
      await (await tickBitmap.flipTick(2, await type2())).wait()
      expect(await tickBitmap.isInitialized(1)).to.eq(false)
    })
    it('is not changed by another flip to a different tick on another word', async () => {
      await (await tickBitmap.flipTick(1 + 256, await type2())).wait()
      expect(await tickBitmap.isInitialized(257)).to.eq(true)
      expect(await tickBitmap.isInitialized(1)).to.eq(false)
    })
  })

  describe('#flipTick', () => {
    it('flips only the specified tick', async () => {
      await (await tickBitmap.flipTick(-230, await type2())).wait()
      expect(await tickBitmap.isInitialized(-230)).to.eq(true)
      expect(await tickBitmap.isInitialized(-231)).to.eq(false)
      expect(await tickBitmap.isInitialized(-229)).to.eq(false)
      expect(await tickBitmap.isInitialized(-230 + 256)).to.eq(false)
      expect(await tickBitmap.isInitialized(-230 - 256)).to.eq(false)
      await (await tickBitmap.flipTick(-230, await type2())).wait()
      expect(await tickBitmap.isInitialized(-230)).to.eq(false)
      expect(await tickBitmap.isInitialized(-231)).to.eq(false)
      expect(await tickBitmap.isInitialized(-229)).to.eq(false)
      expect(await tickBitmap.isInitialized(-230 + 256)).to.eq(false)
      expect(await tickBitmap.isInitialized(-230 - 256)).to.eq(false)
    })

    it('reverts only itself', async () => {
      await tickBitmap.flipTick(-230, await type2())
      await tickBitmap.flipTick(-259, await type2())
      await tickBitmap.flipTick(-229, await type2())
      await tickBitmap.flipTick(500, await type2())
      await tickBitmap.flipTick(-259, await type2())
      await tickBitmap.flipTick(-229, await type2())
      await (await tickBitmap.flipTick(-259, await type2())).wait()

      expect(await tickBitmap.isInitialized(-259)).to.eq(true)
      expect(await tickBitmap.isInitialized(-229)).to.eq(false)
    })

    it('gas cost of flipping first tick in word to initialized', async () => {
      await snapshotGasCost(await tickBitmap.getGasCostOfFlipTick(1, await type2()))
    })
    it('gas cost of flipping second tick in word to initialized', async () => {
      await tickBitmap.flipTick(0, await type2())
      await snapshotGasCost(await tickBitmap.getGasCostOfFlipTick(1, await type2()))
    })
    it('gas cost of flipping a tick that results in deleting a word', async () => {
      await tickBitmap.flipTick(0, await type2())
      await snapshotGasCost(await tickBitmap.getGasCostOfFlipTick(0, await type2()))
    })
  })

  describe('#nextInitializedTickWithinOneWord', () => {
    beforeEach('set up some ticks', async () => {
      // word boundaries are at multiples of 256
      await initTicks([-200, -55, -4, 70, 78, 84, 139, 240, 535])
    })

    describe('lte = false', async () => {
      it('returns tick to right if at initialized tick', async () => {
        const { next, initialized } = await tickBitmap.nextInitializedTickWithinOneWord(78, false)
        expect(next).to.eq(84)
        expect(initialized).to.eq(true)
      })
      it('returns tick to right if at initialized tick', async () => {
        const { next, initialized } = await tickBitmap.nextInitializedTickWithinOneWord(-55, false)
        expect(next).to.eq(-4)
        expect(initialized).to.eq(true)
      })

      it('returns the tick directly to the right', async () => {
        const { next, initialized } = await tickBitmap.nextInitializedTickWithinOneWord(77, false)
        expect(next).to.eq(78)
        expect(initialized).to.eq(true)
      })
      it('returns the tick directly to the right', async () => {
        const { next, initialized } = await tickBitmap.nextInitializedTickWithinOneWord(-56, false)
        expect(next).to.eq(-55)
        expect(initialized).to.eq(true)
      })

      it('returns the next words initialized tick if on the right boundary', async () => {
        const { next, initialized } = await tickBitmap.nextInitializedTickWithinOneWord(255, false)
        expect(next).to.eq(511)
        expect(initialized).to.eq(false)
      })
      it('returns the next words initialized tick if on the right boundary', async () => {
        const { next, initialized } = await tickBitmap.nextInitializedTickWithinOneWord(-257, false)
        expect(next).to.eq(-200)
        expect(initialized).to.eq(true)
      })

      it('returns the next initialized tick from the next word', async () => {
        await (await tickBitmap.flipTick(340, await type2())).wait()
        const { next, initialized } = await tickBitmap.nextInitializedTickWithinOneWord(328, false)
        expect(next).to.eq(340)
        expect(initialized).to.eq(true)
      })
      it('does not exceed boundary', async () => {
        const { next, initialized } = await tickBitmap.nextInitializedTickWithinOneWord(508, false)
        expect(next).to.eq(511)
        expect(initialized).to.eq(false)
      })
      it('skips entire word', async () => {
        const { next, initialized } = await tickBitmap.nextInitializedTickWithinOneWord(255, false)
        expect(next).to.eq(511)
        expect(initialized).to.eq(false)
      })
      it('skips half word', async () => {
        const { next, initialized } = await tickBitmap.nextInitializedTickWithinOneWord(383, false)
        expect(next).to.eq(511)
        expect(initialized).to.eq(false)
      })

      it('gas cost on boundary', async () => {
        await snapshotGasCost(await tickBitmap.getGasCostOfNextInitializedTickWithinOneWord(255, false))
      })
      it('gas cost just below boundary', async () => {
        await snapshotGasCost(await tickBitmap.getGasCostOfNextInitializedTickWithinOneWord(254, false))
      })
      it('gas cost for entire word', async () => {
        await snapshotGasCost(await tickBitmap.getGasCostOfNextInitializedTickWithinOneWord(768, false))
      })
    })

    describe('lte = true', () => {
      it('returns same tick if initialized', async () => {
        const { next, initialized } = await tickBitmap.nextInitializedTickWithinOneWord(78, true)

        expect(next).to.eq(78)
        expect(initialized).to.eq(true)
      })
      it('returns tick directly to the left of input tick if not initialized', async () => {
        const { next, initialized } = await tickBitmap.nextInitializedTickWithinOneWord(79, true)

        expect(next).to.eq(78)
        expect(initialized).to.eq(true)
      })
      it('will not exceed the word boundary', async () => {
        const { next, initialized } = await tickBitmap.nextInitializedTickWithinOneWord(258, true)

        expect(next).to.eq(256)
        expect(initialized).to.eq(false)
      })
      it('at the word boundary', async () => {
        const { next, initialized } = await tickBitmap.nextInitializedTickWithinOneWord(256, true)

        expect(next).to.eq(256)
        expect(initialized).to.eq(false)
      })
      it('word boundary less 1 (next initialized tick in next word)', async () => {
        const { next, initialized } = await tickBitmap.nextInitializedTickWithinOneWord(72, true)

        expect(next).to.eq(70)
        expect(initialized).to.eq(true)
      })
      it('word boundary', async () => {
        const { next, initialized } = await tickBitmap.nextInitializedTickWithinOneWord(-257, true)

        expect(next).to.eq(-512)
        expect(initialized).to.eq(false)
      })
      it('entire empty word', async () => {
        const { next, initialized } = await tickBitmap.nextInitializedTickWithinOneWord(1023, true)

        expect(next).to.eq(768)
        expect(initialized).to.eq(false)
      })
      it('halfway through empty word', async () => {
        const { next, initialized } = await tickBitmap.nextInitializedTickWithinOneWord(900, true)

        expect(next).to.eq(768)
        expect(initialized).to.eq(false)
      })
      it('boundary is initialized', async () => {
        await (await tickBitmap.flipTick(329, await type2())).wait()
        const { next, initialized } = await tickBitmap.nextInitializedTickWithinOneWord(456, true)

        expect(next).to.eq(329)
        expect(initialized).to.eq(true)
      })

      it('gas cost on boundary', async () => {
        await snapshotGasCost(await tickBitmap.getGasCostOfNextInitializedTickWithinOneWord(256, true))
      })
      it('gas cost just below boundary', async () => {
        await snapshotGasCost(await tickBitmap.getGasCostOfNextInitializedTickWithinOneWord(255, true))
      })
      it('gas cost for entire word', async () => {
        await snapshotGasCost(await tickBitmap.getGasCostOfNextInitializedTickWithinOneWord(1024, true))
      })
    })
  })
})

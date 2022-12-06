import { ApiPromise } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import Token_factory from '../types/constructors/psp22_token';
import Farming_factory from '../types/constructors/master_chef_mock';
import Rewarder_factory from '../types/constructors/rewarder_contract';
import Token from '../types/contracts/psp22_token';
import Farming from '../types/contracts/master_chef_mock';
import Rewarder from '../types/contracts/rewarder_contract';
import {
  changeTokenBalances,
  emit,
  parseUnits,
  revertedWith,
  setupApi,
} from './setup';
import { expect } from '@jest/globals';
describe('Farming', () => {
  let api: ApiPromise;
  let deployer: KeyringPair;
  let bob: KeyringPair;
  let [aplo, lp, dummy]: Token[] = [];
  let farming: Farming;
  let rewarder: Rewarder;
  let originBlock: number;
  const BLOCK_PER_PERIOD = 215_000;
  const FIRST_PERIOD_REWERD_SUPPLY = 151629858171523000000n;
  const ACC_ARSW_PRECISION = 1_000_000_000_000n;
  const MAX_PERIOD = 23;

  afterAll(() => {
    api.disconnect();
  });

  async function setup(): Promise<void> {
    ({ api: api, alice: deployer, bob } = await setupApi());
    const tokenFactory = new Token_factory(api, deployer);
    const { address: aploAddress } = await tokenFactory.new(
      parseUnits(1_000_000).toString(),
      'Apollo Token' as unknown as string[],
      'APLO' as unknown as string[],
      18,
    );
    const { address: lpAddress } = await tokenFactory.new(
      parseUnits(1_000_000).toString(),
      'LP Token' as unknown as string[],
      'LPT' as unknown as string[],
      18,
    );
    const { address: dummyAddress } = await tokenFactory.new(
      parseUnits(1_000_000).toString(),
      'Dummy Token' as unknown as string[],
      'Dummy' as unknown as string[],
      18,
    );
    aplo = new Token(aploAddress, deployer, api);
    lp = new Token(lpAddress, deployer, api);
    const { gasRequired } = await lp.query.mint(
      bob.address,
      parseUnits(10_000).toString(),
    );
    await lp.tx.mint(bob.address, parseUnits(10_000).toString(), {
      gasLimit: gasRequired,
    });
    dummy = new Token(dummyAddress, deployer, api);
    const farmingFactory = new Farming_factory(api, deployer);
    const { address: farmingAddress } = await farmingFactory.new(aploAddress);
    farming = new Farming(farmingAddress, deployer, api);
    const rewarderFactory = new Rewarder_factory(api, deployer);
    const { address: rewarderAddress } = await rewarderFactory.new(
      parseUnits(1).toString(),
      dummy.address,
      farming.address,
    );
    rewarder = new Rewarder(rewarderAddress, deployer, api);
    ({ value: originBlock } = await farming.query.getFarmingOriginBlock());
  }

  describe('getPeriod', () => {
    it('successfully get 1st block of Period-1', async () => {
      await setup();
      const firstBlockOfPeriodOne = getFirstBlock(1);
      const {
        value: { ok: period },
      } = await farming.query.getPeriod(firstBlockOfPeriodOne);
      expect(period).toBe(1);
    });

    it('successfully get medium block of Period-1', async () => {
      const blockPeriodOne = Math.floor(
        (getFirstBlock(1) + getFirstBlock(2)) / 2,
      );
      const {
        value: { ok: period },
      } = await farming.query.getPeriod(blockPeriodOne);
      expect(period).toBe(1);
    });

    it('successfully get end block of Period-0', async () => {
      const endBlockOfPeriodZero = getFirstBlock(1) - 1;
      const {
        value: { ok: period },
      } = await farming.query.getPeriod(endBlockOfPeriodZero);
      expect(period).toBe(0);
    });

    it('revert if the blockNumber is lower than the ARTHSWAP_ORIGIN_BLOCK', async () => {
      const blockBeforePeriodZero = originBlock - 1;
      revertedWith(
        await farming.query.getPeriod(blockBeforePeriodZero),
        'blockNumberLowerThanOriginBlock',
      );
    });
  });

  describe('periodMax', () => {
    it('successfully get max block of Period-0', async () => {
      const expectedBlock = getFirstBlock(1) - 1;
      const {
        value: { ok: maxBlock },
      } = await farming.query.periodMax(0);
      expect(maxBlock).toBe(expectedBlock);
    });

    it('successfully get max block of Period-1', async () => {
      const expectedBlock = getFirstBlock(2) - 1;
      const {
        value: { ok: maxBlock },
      } = await farming.query.periodMax(1);
      expect(maxBlock).toBe(expectedBlock);
    });
  });

  describe('ARSWPerBlock', () => {
    it.each([0, 1, 23, 24])(
      'Return correct amount of period-%s',
      async (period: number) => {
        const {
          value: { ok },
        } = await farming.query.arswPerBlock(period);
        expect(ok.toHuman()).toBe(getExpectedArswPerBlock(period));
      },
    );
  });

  describe('Add', () => {
    it('Should add pool with reward token multiplier', async () => {
      const { gasRequired } = await farming.query.add(10, lp.address, null);
      const result = await farming.tx.add(10, lp.address, null, {
        gasLimit: gasRequired,
      });
      emit(result, 'LogPoolAddition', {
        poolId: 0,
        allocPoint: 10,
        lpToken: lp.address,
        rewarder: null,
      });
    });

    it('Should call updateAllPools', async () => {
      const { gasRequired } = await farming.query.add(10, dummy.address, null);
      await advanceBlock();
      const result = await farming.tx.add(10, dummy.address, null, {
        gasLimit: gasRequired * 2n,
      });
      const { lastRewardBlock, accArswPerShare } = (
        await farming.query.getPoolInfo(0)
      ).value;
      emit(result, 'LogUpdatePool', {
        poolId: 0,
        lastRewardBlock,
        lpSupply: (await lp.query.balanceOf(farming.address)).value.toNumber(),
        accArswPerShare,
      });
    });

    it('Should reject duplicated LP token', async () => {
      revertedWith(
        await farming.query.add(10, lp.address, null),
        'duplicateLPToken',
      );
    });
  });

  describe('UpdatePool', () => {
    it('Should revert if invalid pool', async () => {
      revertedWith(await farming.query.updatePool(2), 'poolNotFound');
    });
    it('Should emit event LogUpdatePool', async () => {
      const { gasRequired } = await farming.query.updatePool(0);
      await advanceBlock();
      emit(
        await farming.tx.updatePool(0, { gasLimit: gasRequired * 2n }),
        'LogUpdatePool',
        {
          poolId: 0,
          lastRewardBlock: (await farming.query.getBlockNumber()).value,
          lpSupply: (
            await lp.query.balanceOf(farming.address)
          ).value.toNumber(),
          accArswPerShare: 0,
        },
      );
    });
  });

  describe('Set', () => {
    it('Should emit event LogSetPool', async () => {
      let { gasRequired } = await farming.query.set(
        0,
        10,
        dummy.address,
        false,
      );
      let result = await farming.tx.set(0, 10, dummy.address, false, {
        gasLimit: gasRequired * 3n,
      });
      emit(result, 'LogSetPool', {
        poolId: 0,
        allocPoint: 10,
        rewarder: null,
        overwrite: false,
      });
      ({ gasRequired } = await farming.query.set(0, 10, dummy.address, true));
      result = await farming.tx.set(0, 10, dummy.address, true, {
        gasLimit: gasRequired * 2n,
      });
      emit(result, 'LogSetPool', {
        poolId: 0,
        allocPoint: 10,
        rewarder: dummy.address,
        overwrite: true,
      });
    });

    it('Should revert if invalid pool', async () => {
      revertedWith(
        await farming.query.set(2, 10, rewarder.address, false),
        'poolNotFound',
      );
    });

    it('Should call updateAllPools', async () => {
      const { gasRequired } = await farming.query.set(0, 1, lp.address, true);
      await advanceBlock();
      const result = await farming.tx.set(0, 1, null, true, {
        gasLimit: gasRequired * 3n,
      });
      const { lastRewardBlock, accArswPerShare } = (
        await farming.query.getPoolInfo(0)
      ).value;
      emit(result, 'LogUpdatePool', {
        poolId: 0,
        lastRewardBlock,
        lpSupply: (await lp.query.balanceOf(farming.address)).value.toNumber(),
        accArswPerShare,
      });
      emit(
        result,
        'LogUpdatePool',
        {
          poolId: 1,
          lastRewardBlock,
          lpSupply: (
            await dummy.query.balanceOf(farming.address)
          ).value.toNumber(),
          accArswPerShare,
        },
        1,
      );
    });
  });

  describe('PoolLength', () => {
    it('PoolLength should execute', async () => {
      const { value: poolLength } = await farming.query.poolLength();
      expect(poolLength).toBe(2);
    });
  });

  describe('Deposit', () => {
    it('Depositing 0 amount', async () => {
      let { gasRequired } = await lp
        .withSigner(bob)
        .query.approve(farming.address, parseUnits(10_000).toString());
      await lp
        .withSigner(bob)
        .tx.approve(farming.address, parseUnits(10_000).toString(), {
          gasLimit: gasRequired,
        });
      ({ gasRequired } = await farming
        .withSigner(bob)
        .query.deposit(0, 0, bob.address));
      const tx = await farming
        .withSigner(bob)
        .tx.deposit(0, 0, bob.address, { gasLimit: gasRequired });
      emit(tx, 'Deposit', {
        poolId: 0,
        amount: 0,
        to: bob.address,
        user: bob.address,
      });
    });

    it('successfully deposit 10 amount', async () => {
      const { gasRequired } = await farming
        .withSigner(bob)
        .query.deposit(0, 10, bob.address);
      const tx = await changeTokenBalances(
        () =>
          farming
            .withSigner(bob)
            .tx.deposit(0, 10, bob.address, { gasLimit: gasRequired }),
        lp,
        [bob, farming],
        ['-10', '10'],
      );
      emit(tx, 'Deposit', {
        poolId: 0,
        amount: 10,
        to: bob.address,
        user: bob.address,
      });
    });

    it('Depositing into non-existent pool should fail', async () => {
      revertedWith(
        await farming.withSigner(bob).query.deposit(2, 10, bob.address),
        'poolNotFound',
      );
    });
  });

  async function advanceBlock(): Promise<void> {
    await farming.tx.increaseBlockNumber(1, { gasLimit: 30_000_000_000n });
  }
  function getFirstBlock(period: number): number {
    return originBlock + BLOCK_PER_PERIOD * period;
  }
  function getExpectedArswPerBlock(period: number): string {
    const bigintPeriod = BigInt(period);
    return period > MAX_PERIOD
      ? '0'
      : (
          (FIRST_PERIOD_REWERD_SUPPLY * 9n ** bigintPeriod) /
          10n ** bigintPeriod
        ).toString();
  }
});

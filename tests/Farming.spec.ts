import { ApiPromise } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import Token_factory from '../types/constructors/psp22_token';
import Farming_factory from '../types/constructors/master_chef_mock';
import Rewarder_factory from '../types/constructors/rewarder_contract';
import Token from '../types/contracts/psp22_token';
import Farming from '../types/contracts/master_chef_mock';
import Rewarder from '../types/contracts/rewarder_contract';
import { emit, parseUnits, revertedWith, setupApi } from './setup';
import { expect } from 'chai';
describe('Farming', () => {
  let api: ApiPromise;
  let deployer: KeyringPair;
  let [aplo, lp, dummy]: Token[] = [];
  let farming: Farming;
  let rewarder: Rewarder;
  let originBlock: number;
  const BLOCK_PER_PERIOD = 215_000;

  async function setup(): Promise<void> {
    ({ api: api, alice: deployer } = await setupApi());
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
      const firstBlockOfPeriodOne = originBlock + 215_000;
      const {
        value: { ok: period },
      } = await farming.query.getPeriod(firstBlockOfPeriodOne);
      expect(period).equal(1);
    });

    it('successfully get medium block of Period-1', async () => {
      const blockPeriodOne = originBlock + 215_000 + 100_000;
      const {
        value: { ok: period },
      } = await farming.query.getPeriod(blockPeriodOne);
      expect(period).equals(1);
    });

    it('successfully get end block of Period-0', async () => {
      const endBlockOfPeriodZero = originBlock + BLOCK_PER_PERIOD - 1;
      const {
        value: { ok: period },
      } = await farming.query.getPeriod(endBlockOfPeriodZero);
      expect(period).equals(0);
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
      const expectedBlock = originBlock + BLOCK_PER_PERIOD - 1;
      const {
        value: { ok: maxBlock },
      } = await farming.query.periodMax(0);
      expect(maxBlock).equals(expectedBlock);
    });

    it('successfully get max block of Period-1', async () => {
      const expectedBlock = originBlock + 2 * BLOCK_PER_PERIOD - 1;
      const {
        value: { ok: maxBlock },
      } = await farming.query.periodMax(1);
      expect(maxBlock).to.be.equal(expectedBlock);
    });
  });

  describe('ARSWPerBlock', () => {
    it('Return correct amount of period-0', async () => {
      const {
        value: { ok },
      } = await farming.query.arswPerBlock(0);
      expect(ok.toHuman()).equals('151629858171523000000');
    });
    it('Return correct amount of period-1', async () => {
      const {
        value: { ok },
      } = await farming.query.arswPerBlock(1);
      expect(ok.toHuman()).to.be.equal('136466872354370700000');
    });

    it('Return correct amount of period-23', async () => {
      const {
        value: { ok },
      } = await farming.query.arswPerBlock(23);
      expect(ok.toHuman()).to.be.equal('13438860500658934856');
    });

    it('Return amount 0 of period-24', async () => {
      const {
        value: { ok },
      } = await farming.query.arswPerBlock(24);
      expect(ok.toHuman()).to.be.equal('0');
    });
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
      const { gasRequired } = await farming.query.set(0, 1, lp.address, false);
      await advanceBlock();
      const result = await farming.tx.set(0, 1, lp.address, false, {
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
      expect(poolLength).equals(2);
    });
  });

  async function advanceBlock(): Promise<void> {
    await farming.tx.increaseBlockNumber(1, { gasLimit: 30_000_000_000n });
  }
});

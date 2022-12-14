import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import Token_factory from '../types/constructors/psp22_token';
import Pair_factory from '../types/constructors/pair_contract';
import Factory_factory from '../types/constructors/factory_contract';
import Wnative_factory from '../types/constructors/wnative_contract';
import Router_factory from '../types/constructors/router_contract';
import Farming_factory from '../types/constructors/master_chef_contract';
import Rewarder_factory from '../types/constructors/rewarder_contract';
import Token from '../types/contracts/psp22_token';
import Pair from '../types/contracts/pair_contract';
import Factory from '../types/contracts/factory_contract';
import Wnative from '../types/contracts/wnative_contract';
import Router from '../types/contracts/router_contract';
import Farming from '../types/contracts/master_chef_contract';
import Rewarder from '../types/contracts/rewarder_contract';
import { parseUnits } from '../tests/utils';
import 'dotenv/config';

// Create a new instance of contract
const wsProvider = new WsProvider('wss://public-rpc.pinknode.io/shibuya');
// Create a keyring instance
const keyring = new Keyring({ type: 'sr25519' });

async function main(): Promise<void> {
  const api = await ApiPromise.create({ provider: wsProvider });
  const deployer = keyring.addFromUri(process.env.PRIVATE_KEY);
  const tokenFactory = new Token_factory(api, deployer);
  const totalSupply = parseUnits(1_000_000).toString();
  const stableTotalSupply = parseUnits(1_000_000, 6).toString();
  const { address: aploAddress } = await tokenFactory.new(
    totalSupply,
    'Apollo Token' as unknown as string[],
    'APLO' as unknown as string[],
    18,
  );
  console.log('aplo token address:', aploAddress);
  const aplo = new Token(aploAddress, deployer, api);
  const { address: usdcAddress } = await tokenFactory.new(
    stableTotalSupply,
    'USD Coin' as unknown as string[],
    'USDC' as unknown as string[],
    6,
  );
  console.log('usdc token address:', usdcAddress);
  const usdc = new Token(usdcAddress, deployer, api);
  const { address: usdtAddress } = await tokenFactory.new(
    stableTotalSupply,
    'Tether USD' as unknown as string[],
    'USDT' as unknown as string[],
    6,
  );
  console.log('usdt token address:', usdtAddress);
  const usdt = new Token(usdtAddress, deployer, api);

  const pairFactory = new Pair_factory(api, deployer);
  const pair = new Pair((await pairFactory.new()).address, deployer, api);
  const pairHash = pair.abi.info.source.wasmHash.toHex();

  const factoryFactory = new Factory_factory(api, deployer);
  const { address: factoryAddress } = await factoryFactory.new(deployer.address, pairHash);
  console.log('factory address:', factoryAddress);
  const factory = new Factory(
    factoryAddress,
    deployer,
    api,
  );

  const wnativeFactory = new Wnative_factory(api, deployer);
  const { address: wnativeAddress } = await wnativeFactory.new();
  console.log('wnative address:', wnativeAddress);
  const wnative = new Wnative(wnativeAddress, deployer, api);

  const routerFactory = new Router_factory(api, deployer);
  const { address: routerAddress } = await routerFactory.new(factory.address, wnative.address, pairHash);
  console.log('router address:', routerAddress);
  const router = new Router(
    routerAddress,
    deployer,
    api,
  );

  const deadline = '111111111111111111';
  const aploAmount = parseUnits(100).toString();
  const oneSby = parseUnits(1).toString();
  const oneStableCoinAmount = parseUnits(100, 6).toString();
  let { gasRequired } = await aplo.query.approve(router.address, aploAmount);
  await aplo.tx.approve(router.address, aploAmount, {
    gasLimit: gasRequired
  });
  ({ gasRequired } = await router.query.addLiquidityNative(
    aplo.address,
    aploAmount,
    aploAmount,
    oneSby,
    deployer.address,
    deadline,
    {
      value: oneSby,
    },
  ));
  await router.tx.addLiquidityNative(
    aplo.address,
    aploAmount,
    aploAmount,
    oneSby,
    deployer.address,
    deadline,
    {
      gasLimit: gasRequired,
      value: oneSby,
    },
  );

  ({ gasRequired } = await usdc.query.approve(router.address, oneStableCoinAmount));
  await usdc.tx.approve(router.address, oneStableCoinAmount, {
    gasLimit: gasRequired
  });
  ({ gasRequired } = await router.query.addLiquidityNative(
    usdc.address,
    oneStableCoinAmount,
    oneStableCoinAmount,
    oneSby,
    deployer.address,
    deadline,
    {
      value: oneSby,
    },
  ));
  await router.tx.addLiquidityNative(
    usdc.address,
    oneStableCoinAmount,
    oneStableCoinAmount,
    oneSby,
    deployer.address,
    deadline,
    {
      gasLimit: gasRequired,
      value: oneSby,
    },
  );


  ({ gasRequired } = await usdt.query.approve(router.address, oneStableCoinAmount));
  await usdt.tx.approve(router.address, oneStableCoinAmount, {
    gasLimit: gasRequired
  });
  ({ gasRequired } = await router.query.addLiquidityNative(
    usdt.address,
    oneStableCoinAmount,
    oneStableCoinAmount,
    oneSby,
    deployer.address,
    deadline,
    {
      value: oneSby,
    },
  ));
  await router.tx.addLiquidityNative(
    usdt.address,
    oneStableCoinAmount,
    oneStableCoinAmount,
    oneSby,
    deployer.address,
    deadline,
    {
      gasLimit: gasRequired,
      value: oneSby,
    },
  );

  const { value: aploSbyAddress } = await factory.query.getPair(aplo.address, wnativeAddress);
  console.log('aploSbyAddress', aploSbyAddress);
  const { value: usdcSbyAddress } = await factory.query.getPair(usdc.address, wnativeAddress);
  console.log('usdcSbyAddress', usdcSbyAddress);
  const { value: usdtSbyAddress } = await factory.query.getPair(usdt.address, wnativeAddress);
  console.log('usdtSbyAddress', usdtSbyAddress);

  const farmingFactory = new Farming_factory(api, deployer);
  const { address: farmingAddress } = await farmingFactory.new(aploAddress);
  console.log('farmingAddress', farmingAddress);
  const farming = new Farming(farmingAddress, deployer, api);
  ({ gasRequired } = await aplo.query.mint(
    farming.address,
    parseUnits(1_000_000_000).toString(),
  ));
  await aplo.tx.mint(farming.address, parseUnits(1_000_000_000).toString(), {
    gasLimit: gasRequired,
  });

  ({ gasRequired } = await farming.query.add(30, aploSbyAddress, null));
  await farming.tx.add(10, aploSbyAddress, null, {
    gasLimit: gasRequired,
  });

  ({ gasRequired } = await farming.query.add(15, usdcSbyAddress, null));
  await farming.tx.add(10, usdcSbyAddress, null, {
    gasLimit: gasRequired,
  });

  ({ gasRequired } = await farming.query.add(15, usdtSbyAddress, null));
  await farming.tx.add(10, usdtSbyAddress, null, {
    gasLimit: gasRequired,
  });

  const { address: rewardAddress } = await tokenFactory.new(
    totalSupply,
    'Reward Token' as unknown as string[],
    'REWARD' as unknown as string[],
    18,
  );
  console.log('reward token address:', rewardAddress);
  const reward = new Token(rewardAddress, deployer, api);
  const rewarderFactory = new Rewarder_factory(api, deployer);
  const { address: rewarderAddress } = await rewarderFactory.new(parseUnits(1).toString(), rewardAddress, farmingAddress);
  console.log('rewarder address:', rewarderAddress);
  const rewarder = new Rewarder(rewarderAddress, deployer, api);
  ({ gasRequired } = await reward.query.mint(
    rewarder.address,
    parseUnits(1_000_000_000).toString(),
  ));
  await reward.tx.mint(rewarder.address, parseUnits(1_000_000_000).toString(), {
    gasLimit: gasRequired,
  });
  ({ gasRequired } = await farming.query.set(1, 15, rewarder.address, true));
  await farming.tx.set(1, 15, rewarder.address, true, {
    gasLimit: gasRequired,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

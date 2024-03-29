### This repository is not maintained anymore but stays here for legacy. All dApps were moved and are maintained in [Swanky dApps repository](https://github.com/orgs/swanky-dapps/repositories)

# Astar WASM showcase dApps

This repository contains examples of ink! contracts and their respective UIs that can be deployed on Astar network.
If you are looking for unaudited production ready dApps (ink! + UI) this repo is for you.

#### Contribute to this repository
contributions are welcome:
- If you find an issue or a refactor idea please open an issue
- If you want to add your own example open a Pull Request

## dApps
#### Uniswap-V2 - DEX
This repository host the first version of DEX. For latest DEX please go to the new repository: [Swanky dApps - DEX](https://github.com/swanky-dapps/dex)

### Farming
A farming dApp line by line implementation of [ArthSwap master chef](https://github.com/ArthSwap/ArthSwap-MasterChef) adapted from
[sushiswap](https://github.com/sushiswap/sushiswap/blob/archieve/canary/contracts/MasterChefV2.sol)

#### DAO
On Chain governance based on [Governor](https://github.com/OpenZeppelin/openzeppelin-contracts/tree/master/contracts/governance) contracts of OpenZeppelin

#### Tests
The test folder contains integration tests for the contracts. Tests are made with two different test frameworks, redspot and typechain.

**Runs the tests**
1. Run a local node \
   Please use [swanky-node](https://github.com/AstarNetwork/swanky-node/releases)
2. The integration tests uses typechain. Node version should be >= 16
     ```bash
     yarn install
     yarn compile
     yarn test:typechain
     ```

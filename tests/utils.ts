import type { WeightV2 } from '@polkadot/types/interfaces'
import { ApiPromise } from '@polkadot/api';
export function parseUnits(amount: bigint | number, decimals = 18): bigint {
  return BigInt(amount) * 10n ** BigInt(decimals);
}

export function scaleWeightV2(api: ApiPromise, weight: WeightV2, scale: number): WeightV2 {
  return api.registry.createType(
    'WeightV2', {
    refTime: (weight as WeightV2).refTime.unwrap().muln(scale),
    proofSize: (weight as WeightV2).proofSize.unwrap().muln(scale),
  }) as WeightV2
}

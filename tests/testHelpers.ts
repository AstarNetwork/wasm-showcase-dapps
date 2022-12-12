import { ReturnNumber } from '@supercolony/typechain-types';
import Token from '../types/contracts/psp22_token';
import { expect } from '@jest/globals';
export { parseUnits } from './utils';

export function emit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: { events?: any },
  name: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types
  args: any,
  index = 0,
): void {
  const events = result.events.filter(
    (event: { name: string }) => event.name === name,
  );
  const event = events[index];
  for (const key of Object.keys(event.args)) {
    if (event.args[key] instanceof ReturnNumber) {
      event.args[key] = event.args[key].toNumber();
    }
  }
  expect(event).toEqual({
    name,
    args,
  });
}

export function revertedWith(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: { value: { err?: any } },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types
  errorTitle: any,
): void {
  if (typeof errorTitle === 'object') {
    expect(result.value).toHaveProperty('err', errorTitle);
  } else {
    expect(result.value.err).toHaveProperty(errorTitle);
  }
}

export async function changeTokenBalances<T>(
  txThunk: () => Promise<T>,
  token: Token,
  actors: { address: string }[],
  expectedChanges: string[],
): Promise<T> {
  const accounts = actors.map((actor) => actor.address);
  const beforeBalances = await Promise.all(
    accounts.map(
      async (account) => (await token.query.balanceOf(account)).value.rawNumber,
    ),
  );
  const result = await txThunk();
  const afterBalances = await Promise.all(
    accounts.map(
      async (account) => (await token.query.balanceOf(account)).value.rawNumber,
    ),
  );
  const changes = afterBalances.map((afterBalance, i) =>
    afterBalance.sub(beforeBalances[i]).toString(),
  );
  expect(changes).toEqual(expectedChanges);
  return result;
}

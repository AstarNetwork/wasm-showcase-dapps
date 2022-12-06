export default async function teardown() {
  await globalThis.setup.api.disconnect();
}

export async function loadFeature(name: string): Promise<unknown> {
  const mod = await import(`./features/${name}.js`);
  return mod.default;
}

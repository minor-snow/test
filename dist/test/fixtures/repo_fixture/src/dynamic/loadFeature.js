export async function loadFeature(name) {
    const mod = await import(`./features/${name}.js`);
    return mod.default;
}
//# sourceMappingURL=loadFeature.js.map
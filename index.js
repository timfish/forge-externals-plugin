const { Walker, DepType } = require("flora-colossus");
const { dirname } = require("path");

const defaultOpts = {
  externals: [],
  includeDeps: true,
};

class ForgeExternalsPlugin {
  __isElectronForgePlugin = true;

  constructor(opts) {
    const options = { ...defaultOpts, ...(opts || {}) };
    this._externals = options.externals;
    this._includeDeps = options.includeDeps;
  }

  init = async (dir) => {
    this._modules = new Set(this._externals);

    if (this._includeDeps) {
      for (const external of this._externals) {
        const moduleRoot = dirname(
          require.resolve(`${external}/package.json`, { paths: [dir] })
        );

        const walker = new Walker(moduleRoot);
        // These are private so it's quite nasty!
        walker.modules = [];
        await walker.walkDependenciesForModule(moduleRoot, DepType.PROD);
        walker.modules
          .filter((dep) => dep.nativeModuleType === DepType.PROD)
          .map((dep) => dep.name)
          .forEach((name) => this._modules.add(name));
      }
    }
  };

  getHook(hookName) {
    switch (hookName) {
      case "resolveForgeConfig":
        return this.resolveForgeConfig;
    }
  }

  resolveForgeConfig = async (forgeConfig) => {
    // The webpack plugin already sets the ignore function.
    const existingIgnoreFn = forgeConfig.packagerConfig.ignore;

    // We override it and ensure we include external modules too
    forgeConfig.packagerConfig.ignore = (file) => {
      const existingResult = existingIgnoreFn(file);

      if (existingResult == false) {
        return false;
      }

      if (file === "/node_modules") {
        return false;
      }

      for (const module of this._modules) {
        if (file.startsWith(`/node_modules/${module}`)) {
          return false;
        }
      }

      return true;
    };

    return forgeConfig;
  };
}

module.exports = ForgeExternalsPlugin;

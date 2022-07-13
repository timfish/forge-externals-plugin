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

  init = (dir) => {
    this._dir = dir;
  };

  getHook(hookName) {
    switch (hookName) {
      case "resolveForgeConfig":
        return this.resolveForgeConfig;
    }
  }

  resolveForgeConfig = async (forgeConfig) => {
    const foundModules = new Set(this._externals);

    if (this._includeDeps) {
      for (const external of this._externals) {
        const moduleRoot = dirname(
          require.resolve(`${external}/package.json`, { paths: [this._dir] })
        );

        const walker = new Walker(moduleRoot);
        // These are private so it's quite nasty!
        walker.modules = [];
        await walker.walkDependenciesForModule(moduleRoot, DepType.PROD);
        walker.modules
          .filter((dep) => dep.nativeModuleType === DepType.PROD)
          .map((dep) => dep.name)
          .forEach((name) => foundModules.add(name));
      }
    }

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

      for (const module of foundModules) {
        if (file.startsWith(`/node_modules/${module}`) || file.startsWith(`/node_modules/${module.split('/')[0]}`)) {
          return false;
        }
      }

      return true;
    };

    return forgeConfig;
  };
}

module.exports = ForgeExternalsPlugin;

const { Walker, DepType } = require("flora-colossus");
const { dirname, join } = require("path");
const { copy, mkdir } = require("fs-extra");

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
      case "packageAfterCopy":
        return this.packageAfterCopy;
    }
  }

  getHooks() {
    return {
      "resolveForgeConfig": this.resolveForgeConfig,
      "packageAfterCopy": this.packageAfterCopy,
    };
  }

  resolveForgeConfig = async (forgeConfig) => {
    const foundModules = new Set(this._externals);
    this.modulesToCopy = {};

    if (this._includeDeps) {
      for (const external of this._externals) {
        const moduleRoot = dirname(
          require.resolve(`${external}/package.json`, { paths: [this._dir] })
        );

        // Add the external module to copy list
        this.modulesToCopy[external] = moduleRoot;

        const walker = new Walker(moduleRoot);
        // These are private so it's quite nasty!
        walker.modules = [];
        await walker.walkDependenciesForModule(moduleRoot, DepType.PROD);
        walker.modules
          .filter((dep) => dep.nativeModuleType === DepType.PROD)
          .forEach((dep) => {
            this.modulesToCopy[dep.name] = dep.path;
            foundModules.add(dep.name)
          });
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
          delete modulesToCopy[module]
          return false;
        }
      }

      return true;
    };

    return forgeConfig;
  };

  packageAfterCopy = async (config, buildPath) => {
    // Any packages that haven't been copied yet need to be manually sent over.
    for (const module of Object.entries(this.modulesToCopy)) {
      const outFolder = join(buildPath, "node_modules", module[0]);
      await mkdir(outFolder, { recursive: true });
      await copy(module[1], outFolder);
    }
  }
}

module.exports = ForgeExternalsPlugin;

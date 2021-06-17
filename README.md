# @timfish/forge-externals-plugin

When using Electron with Webpack, the easiest way to support native
modules is to add them to Webpack `externals` configuration. This tells webpack
to load them from `node_modules` via `require()`:

```js
module.exports = {
  module: {
    rules,
  },
  plugins: plugins,
  resolve: {
    extensions: [".js", ".ts", ".jsx", ".tsx", ".css"],
  },
  externals: {
    // Always load `native-hello-world` via require
    "native-hello-world": "commonjs2 native-hello-world",
  },
};
```

This works in development but with Electron Forge + Webpack,
`node_modules` gets excluded during packaging so the modules are missing in the
packaged app.

This plugin should be added after `@electron-forge/plugin-webpack` and it
ensures that your external modules and their dependencies are included in the
packaged app.

```json
 "config": {
    "forge": {
      "packagerConfig": {},
      "makers": [],
      "plugins": [
        [
          "@electron-forge/plugin-webpack",
          {
            "mainConfig": "./webpack.main.config.js",
            "renderer": {
              "config": "./webpack.renderer.config.js",
              "entryPoints": [
                {
                  "html": "./src/index.html",
                  "js": "./src/renderer.ts",
                  "name": "main_window"
                }
              ]
            }
          }
        ],
        [
          "@timfish/forge-externals-plugin",
          {
            "externals": ["native-hello-world"],
            "includeDeps": true
          }
        ]
      ]
    }
  },
```

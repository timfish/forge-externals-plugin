// eslint-disable-next-line @typescript-eslint/no-var-requires
const { resolve } = require("path");

module.exports = [
  {
    test: /\.tsx?$/,
    exclude: /(node_modules|\.webpack)/,
    use: {
      loader: "ts-loader",
      options: {
        transpileOnly: true,
      },
    },
  },
];

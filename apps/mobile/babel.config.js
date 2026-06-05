module.exports = function babelConfig(api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      require("../../node_modules/babel-preset-expo/build/expo-router-plugin.js")
        .expoRouterBabelPlugin,
    ],
  };
};

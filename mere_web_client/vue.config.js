const { defineConfig } = require('@vue/cli-service');

module.exports = defineConfig({
  transpileDependencies: true,
  chainWebpack: config => {
    config.module
        .rule('ts')
        .test(/\.ts$/)
        .use('ts-loader')
        .loader('ts-loader')
        .tap(options => {
          if (!options) {
            options = {};
          }
          options.appendTsSuffixTo = [/\.vue$/];
          return options;
        });

    config.module
        .rule('vue')
        .use('vue-loader')
        .loader('vue-loader')
        .tap(options => {
          return options;
        });
  }
});

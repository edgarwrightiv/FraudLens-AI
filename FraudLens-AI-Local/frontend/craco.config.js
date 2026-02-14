module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.devServer = {
        ...webpackConfig.devServer,
        setupMiddlewares: (middlewares, devServer) => {
          if (!devServer) {
            throw new Error('webpack-dev-server is not defined');
          }
          return middlewares;
        },
      };
      return webpackConfig;
    },
  },
};
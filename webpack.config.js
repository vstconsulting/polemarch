const webpack = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");
const BabelMinifyPlugin = require("babel-minify-webpack-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const VueLoaderPlugin = require("vue-loader/lib/plugin");

require("dotenv").config();
const ENV = process.env.APP_ENV;
const isProd = ENV === "prod";

const enableAnalyzer = process.env.BUNDLE_ANALYZER === "true";

const KB = 1024;
const entrypoints_dir = __dirname + "/frontend_src";

function setMode() {
  if (isProd) {
    return "production";
  } else {
    return "development";
  }
}

const config = {
  mode: setMode(),
  entry: {
    pmlib: entrypoints_dir + "/main.js",
    doc: entrypoints_dir + "/doc.js"
  },
  output: {
    path: __dirname + "/polemarch/static/polemarch",
    filename: "[name].js",
    chunkFilename: "[name].chunk.js",
    publicPath: "/static/polemarch/",
    library: "[name]",
    libraryTarget: "var"

  },
  plugins: [
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
    new CleanWebpackPlugin(),
    new VueLoaderPlugin()
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              [
                "@babel/preset-env",
                {
                  corejs: 3,
                  useBuiltIns: "usage"
                }
              ]
            ]
          }
        },
        exclude: [/node_modules/]
      },
      {
        test: /\.((css)|(scss))$/i,
        use: ["style-loader", "css-loader", "sass-loader"]
      },
      {
        test: /.woff2$/,
        use: {
          loader: "url-loader",
          options: {
            limit: 100 * KB
          }
        }
      },
      {
        test: /.(png|jpg|jpeg|gif|svg|woff|ttf|eot)$/,
        use: {
          loader: "url-loader",
          options: {
            limit: 10 * KB
          }
        }
      },
      {
        test: /\.vue$/,
        loader: "vue-loader"
      }
    ]
  },
  optimization: {
    chunkIds: "natural",
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true
      }),
      new BabelMinifyPlugin(),
      new OptimizeCSSAssetsPlugin()
    ]
  }
};

if (enableAnalyzer) {
  config.plugins.push(new BundleAnalyzerPlugin());
}

module.exports = config;

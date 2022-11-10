const path = require('path');
const { VueLoaderPlugin } = require('vue-loader');

require('dotenv').config();
const isProd = process.env.APP_ENV === 'prod';

const KB = 1024;
const frontendSrc = path.resolve(__dirname, 'frontend_src');

module.exports = {
    mode: isProd ? 'production' : 'development',
    entry: {
        pmlib: path.resolve(frontendSrc, 'index.js'),
    },
    output: {
        path: path.resolve(__dirname, 'polemarch/static/polemarch'),
        filename: '[name].js',
        chunkFilename: '[name].chunk.js',
        library: '[name]',
        libraryTarget: 'window',
        clean: true,
    },
    plugins: [
        new VueLoaderPlugin(),
    ],
    externals: {
        moment: 'moment',
        vue: 'Vue27',
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
                exclude: [/node_modules/]
            },
            {
                test: /\.((css)|(scss))$/i,
                use: [
                    'style-loader',
                    {
                        loader: 'css-loader',
                        options: {
                            url: {
                                filter: (url) => !url.startsWith('/static/')
                            }
                        }
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            sassOptions: {
                                quietDeps: true
                            }
                        }
                    }
                ]
            },
            {
                test: /.woff2$/,
                type: 'asset',
                parser: {
                    dataUrlCondition: {maxSize: 100 * KB},
                },

            },
            {
                test: /.(png|jpg|jpeg|gif|svg|woff|ttf|eot)$/,
                type: 'asset',
                parser: {
                    dataUrlCondition: {maxSize: 10 * KB},
                },

            },
            {
                test: /\.vue$/,
                loader: 'vue-loader'
            }
        ]
    },
    cache: isProd ? false : { type: 'filesystem' },
};

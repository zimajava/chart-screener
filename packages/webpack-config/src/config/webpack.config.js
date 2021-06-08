const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin')
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin')
const path = require('path')
const ModuleNotFoundPlugin = require('react-dev-utils/ModuleNotFoundPlugin')
const WatchMissingNodeModulesPlugin = require('react-dev-utils/WatchMissingNodeModulesPlugin')
const TerserPlugin = require('terser-webpack-plugin')
const webpack = require('webpack')
const {BundleAnalyzerPlugin} = require('webpack-bundle-analyzer')

const getClientEnvironment = require('./env')
const modules = require('./modules')
const paths = require('./paths')
const createEnvironmentHash = require('./webpack/persistentCache/createEnvironmentHash')

const shouldUseSourceMap = !process.argv.find((x) => x.toLowerCase() === '--nomap')
const shouldBabelCache = !process.argv.find((x) => x.toLowerCase() === '--prod')
const shouldAnalyze = process.argv.find((x) => x.toLowerCase() === '--analyze')
const webpackDevClientEntry = require.resolve('react-dev-utils/webpackHotDevClient')
const reactRefreshOverlayEntry = require.resolve('react-dev-utils/refreshOverlayInterop')
const imageInlineSizeLimit = parseInt(process.env.IMAGE_INLINE_SIZE_LIMIT || '10000', 10)
const cssRegex = /\.css$/
const lessRegex = /\.less$/


const hasJsxRuntime = (() => {
    if (process.env.DISABLE_NEW_JSX_TRANSFORM === 'true') {
        return false
    }

    try {
        require.resolve('react/jsx-runtime')
        return true
    } catch (e) {
        return false
    }
})()

module.exports = function (webpackEnv, outerConfig) {
    const isEnvDevelopment = webpackEnv === 'development'
    const isEnvProduction = webpackEnv === 'production'

    const env = getClientEnvironment(paths.publicUrlOrPath.slice(0, -1))
    const shouldUseReactRefresh = env.raw.FAST_REFRESH
    const shouldUseHMR = env.raw.HMR

    const getStyleLoaders = (cssOptions, preProcessor) => {
        const loaders = [
            require.resolve('style-loader'),
            {
                loader: require.resolve('css-loader'),
                options: cssOptions
            },
            {
                // Options for PostCSS as we reference these options twice
                // Adds vendor prefixing based on your specified browser support in
                // package.json
                loader: require.resolve('postcss-loader'),
                options: {
                    postcssOptions: {
                        config: false,
                        plugins: [
                            'postcss-flexbugs-fixes',
                            [
                                'postcss-preset-env',
                                {
                                    autoprefixer: {
                                        flexbox: 'no-2009'
                                    },
                                    stage: 3
                                }
                            ],
                            'autoprefixer',
                            'postcss-nested',
                            'postcss-fail-on-warn'
                        ]
                    },
                    sourceMap: isEnvProduction && shouldUseSourceMap
                }
            }
        ].filter(Boolean)
        if (preProcessor) {
            loaders.push(
                {
                    loader: require.resolve('resolve-url-loader'),
                    options: {
                        sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
                        root: paths.appSrc
                    }
                },
                {
                    loader: require.resolve(preProcessor),
                    options: {
                        sourceMap: true
                    }
                }
            )
        }
        return loaders
    }

    return {
        target: ['browserslist'],
        mode: isEnvProduction ? 'production' : isEnvDevelopment && 'development',
        bail: isEnvProduction,
        devtool: isEnvProduction
            ? shouldUseSourceMap
                ? 'source-map'
                : false
            : isEnvDevelopment && 'cheap-module-source-map' /* 'source-map' */,
        watchOptions: {ignored: /node_modules/},
        entry: isEnvDevelopment && !shouldUseReactRefresh ? [webpackDevClientEntry, paths.appIndexJs(outerConfig.entry)] : paths.appIndexJs(outerConfig.entry),
        output: {
            path: paths.appBuild,
            pathinfo: isEnvDevelopment,
            filename: 'js/[name].js',
            publicPath: paths.publicUrlOrPath,
            devtoolModuleFilenameTemplate: isEnvProduction
                ? (info) => path.relative(paths.appSrc, info.absoluteResourcePath).replace(/\\/g, '/')
                : isEnvDevelopment && ((info) => path.resolve(info.absoluteResourcePath).replace(/\\/g, '/')),
            globalObject: 'this',
        },
        externals: outerConfig.externals,
        cache: {
            type: 'filesystem',
            version: createEnvironmentHash(env.raw),
            cacheDirectory: paths.appWebpackCache,
            store: 'pack',
            buildDependencies: {
                defaultWebpack: ['webpack/lib/'],
                config: [__filename]
            }
        },
        optimization: {
            removeAvailableModules: false,
            moduleIds: isEnvProduction ? 'deterministic' : 'named',
            chunkIds: isEnvProduction ? 'deterministic' : 'named',
            minimize: isEnvProduction,
            minimizer: [
                new TerserPlugin({
                    parallel: true,
                    terserOptions: {
                        parse: {ecma: 8},
                        compress: {ecma: 5, warnings: false, comparisons: false, inline: 2},
                        mangle: {safari10: true},
                        keep_classnames: false,
                        keep_fnames: false,
                        output: {ecma: 5, comments: false, ascii_only: true}
                    }
                }),
            ].filter(Boolean),
            splitChunks: false
        },
        resolve: {
            modules: ['node_modules', paths.appNodeModules].concat(modules.additionalModulePaths || []),
            extensions: paths.moduleFileExtensions
                .map((ext) => `.${ext}`)
                .filter((ext) => !ext.includes('ts')),
            alias: {
                ...(modules.webpackAliases || {}),
                ...(outerConfig?.resolve?.alias || {})
            },
            fallback: {
                fs: false,
                tls: false,
                net: false,
                path: false,
                zlib: false,
                http: false,
                https: false,
                stream: false,
                crypto: false
            }
        },
        module: {
            strictExportPresence: true,
            rules: [
                {
                    oneOf: [
                        {
                            test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
                            type: 'asset',
                            generator: {
                                filename: 'media/[hash][ext][query]'
                            },
                            parser: {
                                dataUrlCondition: {
                                    maxSize: imageInlineSizeLimit
                                }
                            }
                        },
                        {
                            test: /\.(js|mjs|jsx|ts|tsx)$/,
                            include: paths.appSrc,
                            loader: require.resolve('babel-loader'),
                            options: {
                                customize: require.resolve('babel-preset-react-app/webpack-overrides'),
                                presets: [
                                    [
                                        require.resolve('babel-preset-react-app'),
                                        {
                                            runtime: hasJsxRuntime ? 'automatic' : 'classic'
                                        }
                                    ]
                                ],

                                plugins: [
                                    [
                                        require.resolve('babel-plugin-named-asset-import'),
                                        {
                                            loaderMap: {
                                                svg: {
                                                    ReactComponent: '@svgr/webpack?-svgo,+titleProp,+ref![path]'
                                                }
                                            }
                                        }
                                    ],
                                    isEnvDevelopment && shouldUseReactRefresh && require.resolve('react-refresh/babel')
                                ].filter(Boolean),
                                cacheDirectory: shouldBabelCache,
                                cacheCompression: false,
                                compact: isEnvProduction
                            }
                        },
                        {
                            test: cssRegex,
                            use: getStyleLoaders({
                                importLoaders: 1,
                                sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment
                            }),
                            sideEffects: true
                        },
                        {
                            test: lessRegex,
                            use: getStyleLoaders(
                                {
                                    url: false,
                                    importLoaders: 3,
                                    sourceMap: shouldUseSourceMap
                                },
                                'less-loader'
                            ),
                            sideEffects: true
                        },
                        {
                            test: /\.woff|\.woff2|\.svg|.eot|\.ttf/,
                            type: 'asset/resource',
                            generator: {
                                filename: 'fonts/[name].[ext]'
                            }
                        },
                        {
                            exclude: [/\.(js|mjs|jsx|ts|tsx)$/, /\.html$/, /\.json$/],
                            type: 'asset/resource',
                            generator: {filename: 'media/[hash][ext][query]'}
                        }
                        // ** STOP ** Are you adding a new loader?
                        // Make sure to add the new loader(s) before the "file" loader.
                    ]
                }
            ]
        },
        plugins: [
            new NodePolyfillPlugin({excludeAliases: ['console']}),
            shouldAnalyze && new BundleAnalyzerPlugin(),
            new HtmlWebpackPlugin({
                inject: true,
                template: paths.appHtml,
                ...(isEnvProduction
                    ? {
                        minify: {
                            removeComments: true,
                            collapseWhitespace: true,
                            removeRedundantAttributes: true,
                            useShortDoctype: true,
                            removeEmptyAttributes: true,
                            removeStyleLinkTypeAttributes: true,
                            keepClosingSlash: true,
                            minifyJS: true,
                            minifyCSS: true,
                            minifyURLs: true
                        }
                    }
                    : undefined)
            }),
            new ModuleNotFoundPlugin(paths.appPath),
            new webpack.DefinePlugin(env.stringified),
            shouldUseHMR && isEnvDevelopment && new webpack.HotModuleReplacementPlugin(),
            isEnvDevelopment &&
            shouldUseReactRefresh &&
            new ReactRefreshWebpackPlugin({
                overlay: {
                    entry: webpackDevClientEntry,
                    module: reactRefreshOverlayEntry,
                    sockIntegration: false
                }
            }),
            isEnvDevelopment && new CaseSensitivePathsPlugin(),
            isEnvDevelopment && new WatchMissingNodeModulesPlugin(paths.appNodeModules),
            new webpack.IgnorePlugin({resourceRegExp: /^\.\/locale$/, contextRegExp: /moment$/}),
        ].filter(Boolean)
    }
}

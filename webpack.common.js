const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: {
    main: './src/resources/js/main.js',
    ko: './src/ko/ko.js',
    login: './src/resources/js/login.js', 
    management: './src/resources/js/management.js',
    main_update_history: './src/resources/js/update_history/main_update_history.js',
    dark_color_scheme: './src/resources/js/utils/dark_color_scheme.js',
  },
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
  },
  optimization: {
    runtimeChunk: { name: 'runtime' }, 
    splitChunks: {
      chunks: 'all',
    },
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        {
          context: 'src/',
          from: 'resources/assets/**/*.+(json|png|mp3|wav)',
        },
        { from: 'src/resources/style.css', to: 'resources/style.css' },
        { from: 'src/index.html', to: 'index.html' },
        { from: 'papers.json', to: 'papers.json' }, 
        { from: 'src/resources/assets/papers', to: 'resources/assets/papers' }
      ],
    }),
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
      chunkFilename: '[id].[contenthash].css',
    }),
    new HtmlWebpackPlugin({
      template: 'src/en/index.html',
      filename: 'en/index.html',
      chunks: [
        'runtime',
        'main',
        'dark_color_scheme',
        'is_embedded_in_other_website',
      ],
      chunksSortMode: 'manual',
      minify: {
        collapseWhitespace: true,
        removeComments: true,
      },
    }),
    new HtmlWebpackPlugin({
      template: 'src/ko/index.html',
      filename: 'ko/index.html',
      chunks: ['runtime', 'ko', 'main', 'dark_color_scheme'],
      chunksSortMode: 'manual',
      minify: {
        collapseWhitespace: true,
        removeComments: true,
      },
    }),
    // 로그인 HTML 생성 플러그인 추가
    new HtmlWebpackPlugin({
      template: 'src/ko/login/index.html',
      filename: 'ko/login/index.html',
      chunks: ['runtime', 'login', 'dark_color_scheme'], 
      chunksSortMode: 'manual',
      minify: {
        collapseWhitespace: true,
        removeComments: true,
      },
    }),
    // 관리 HTML 생성 플러그인 추가
    new HtmlWebpackPlugin({
      template: 'src/ko/management/index.html',
      filename: 'ko/management/index.html',
      chunks: ['runtime', 'management', 'dark_color_scheme'], 
      chunksSortMode: 'manual',
      minify: {
        collapseWhitespace: true,
        removeComments: true,
      },
    }),
    new HtmlWebpackPlugin({
      template: 'src/en/update-history/index.html',
      filename: 'en/update-history/index.html',
      chunks: ['main_update_history', 'dark_color_scheme'],
      chunksSortMode: 'manual',
      minify: {
        collapseWhitespace: true,
        removeComments: true,
      },
    }),
    new HtmlWebpackPlugin({
      template: 'src/ko/update-history/index.html',
      filename: 'ko/update-history/index.html',
      chunks: ['main_update_history', 'dark_color_scheme'],
      chunksSortMode: 'manual',
      minify: {
        collapseWhitespace: true,
        removeComments: true,
      },
    }),
  ],
};
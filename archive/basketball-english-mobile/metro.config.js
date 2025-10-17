module.exports = {
  resolver: {
    assetExts: ['mp3', 'ttf', 'png', 'jpg', 'jpeg', 'svg'],
    sourceExts: ['jsx', 'js', 'ts', 'tsx', 'json', 'cjs'],
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};
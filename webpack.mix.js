let mix = require('laravel-mix');

mix.webpackConfig({
    resolve:{
        fallback:{
            "https": require.resolve("https-browserify"),
            "http": require.resolve("stream-http")
        }
    }
});


mix.js('src/background.js', 'dist').setPublicPath('dist');

mix.copy([
    'src/manifest.json',
    'src/ens.png',
], 'dist')

let mix = require('laravel-mix');

mix.webpackConfig({
    resolve:{
        fallback:{

        }
    }
});


mix.js('src/background.js', 'dist').setPublicPath('dist');

mix.copy([
    'src/manifest.json',
    'src/ens.png',
], 'dist')

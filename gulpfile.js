var gulp = require('gulp');
var path = require('path');

// auto-load gulp-* plugins
var $ = require('gulp-load-plugins')();

// other modules
var del = require('del');
var browserSync = require('browser-sync');
var reload = browserSync.reload;
var merge = require('merge2');
var runSequence = require('run-sequence');
var webpack = require('webpack');
var styleguide = require('sc5-styleguide');

// config
var config = require('./config.json');
var paths = config.paths;

// production mode
var production = $.util.env.p || $.util.env.prod;

// PostCSS plugins
var scssSyntax = require('postcss-scss');
var precss = require('precss');
var mixin = require('postcss-mixins');
var nano = require('cssnano');
var calc = require('postcss-calc');
var at2x = require('postcss-at2x');
var autoprefixer = require('autoprefixer');
var Browsers = ['last 2 versions'];

// =================================================================================================================

//
// sprites
gulp.task('sprites', ['clean:sprites'], function() {

    // normal icons config
    var icons = {
        shape: {
            dimension: {
                maxWidth: 16,
                maxHeight: 16,
                precision: 0
            }
        },
        mode: {
            css: {
                dest: '.',
                sprite: 'img/sprite.css.svg',
                render: {
                    css: {
                        dest: 'css/sprite16.css'
                    }
                },
                hasCommon: true,
                common: 'icon',
                prefix: '.icon__',
                dimensions: true
            }
        }
    };

    // large icons config
    var iconsLarge = JSON.parse(JSON.stringify(icons));
    iconsLarge.shape.dimension.maxWidth = 24;
    iconsLarge.shape.dimension.maxHeight = 24;
    iconsLarge.mode.css.common = 'icon__l';
    iconsLarge.mode.css.prefix = '.icon__l__';
    iconsLarge.mode.css.render.css.dest = 'css/sprite24.css';

    return merge(
        gulp.src('**/*.svg', {cwd: paths.img.src + '/ico'})
            .pipe($.svgSprite(icons)),
        gulp.src('**/*.svg', {cwd: paths.img.src + '/ico'})
            .pipe($.svgSprite(iconsLarge))
        )
        .pipe(gulp.dest(paths.sprites.src));
});


//
// styleguides
gulp.task('styleguide:generate', function() {

    // we want to keep variables
    // and just process mixins
    var sgCssPlugins = [
        calc(),
        mixin()
    ];

    return gulp.src([
            paths.css.src + '/**/*.scss'
        ])
        .pipe($.postcss(sgCssPlugins, {syntax: scssSyntax}))
        .pipe(styleguide.generate({
            title: config.title  + ' Styleguide',
            server: true,
            port: $.util.env.port ? $.util.env.port + 99 : config.port + 1099,
            rootPath: paths.sg.dest,
            overviewPath: 'README.md'
        }))
        .pipe(gulp.dest(paths.sg.dest));
});


gulp.task('styleguide:styles', function() {
    return gulp.src(paths.css.dest + '/main.css')
        .pipe(styleguide.applyStyles())
        .pipe(gulp.dest(paths.sg.dest));
});

gulp.task('styleguide', function(cb){
    return runSequence(
        'styles',
        'styleguide:generate',
        'styleguide:styles',
        cb
    );
});

gulp.task('styleguide-dev', ['styleguide'], function(){
    gulp.watch('./' + paths.css.src + '/**/*.scss', ['styleguide']);
});


//
// styles
gulp.task('styles', function() {

    var svg = require('postcss-svg');

    var preCssPlugins = [
        precss(),
        at2x(),
        svg(),
        autoprefixer({ browsers: Browsers })
    ];

    var postCssPlugins = [
        production ? nano() : null,
        calc()
    ].filter(function(item){
            return item !== null;
        });

    return merge(
        // normalize
        gulp.src(paths.deps.normalize + '/normalize.css'),

        // project styles
        gulp.src(paths.css.src + '/main.scss')
            .pipe($.plumber())
            .pipe($.postcss(preCssPlugins, {parser: scssSyntax})),

        // icons
        gulp.src(paths.sprites.src + '/css/*.css')
        )
        .pipe($.plumber())
        .pipe($.concatCss('main.css', {
            rebaseUrls: false
        }))
        .pipe(!production ? $.sourcemaps.init() : $.util.noop())
        .pipe($.postcss(postCssPlugins))
        .pipe(!production ? $.sourcemaps.write('.') : $.util.noop())
        .pipe(gulp.dest(paths.css.dest));

});

//
// webpack for scripts
gulp.task('webpack', function(cb) {
    var config = require('./webpack.config.js');
    if(production){
        config.plugins =
            [
                new webpack.optimize.UglifyJsPlugin({
                    compress: {
                        warnings: false
                    }
                })
            ]
    }
    webpack(config,
        function(err, stats) {
            if(err) throw new $.util.PluginError('webpack', err);
            $.util.log('[webpack]', stats.toString());
            cb();
        });
});


//
// html
gulp.task('html', function(){
    return gulp.src('src/index.html')
        .pipe($.minifyHtml({
            conditionals: true
        }))
        .pipe(gulp.dest('public/'));
});


//
// fonts
gulp.task('fonts', function(){
    return gulp.src([
            paths.fonts.src + '/**'
        ])
        .pipe(gulp.dest(paths.fonts.dest));
});


//
// images
gulp.task('images', function(){
    return gulp.src([
            paths.img.src + '/**'
        ])
        .pipe(gulp.dest(paths.img.dest));
});

gulp.task('favicon', function(){
    return gulp.src('favicon.ico')
        .pipe(gulp.dest('public/'));
});


//
// video
gulp.task('video', function(){
    return gulp.src([
            paths.video.src + '/**'
        ])
        .pipe(gulp.dest(paths.video.dest));
});


//
// browser sync
gulp.task('sync', function(){
    browserSync.init({
        server: {
            baseDir: "./public"
        },
        files: ["public/**/*.*"],
        port: config.port
//        , logLevel: "debug"
    });
});


//
// run server
gulp.task('run', function(){
    browserSync.init({
        server: {
            baseDir: "./public"
        },
        files: ["public/**/*.*"],
        port: $.util.env.port || config.port + 1000
    });
});


//
// cleanup
gulp.task('clean', function(cb){
    return del([
        'public/*'
    ], cb);
});

gulp.task('clean:sprites', function(cb){
    return del([
        paths.sprites.src
    ], cb);
});

// =================================================================================================================

//
// build
gulp.task('build', ['clean'], function(){
    return runSequence(
        'html',
        'styles',
        'images',
        'fonts',
        'video',
        'webpack',
        'favicon'
    );
});


//
// publish
gulp.task('publish', function(){
    gulp.src([
//            '!./public/exclude.me',
            './public/**'
        ])
        .pipe($.zip('project.zip'))
        .pipe(gulp.dest('./'));
});


//
// default
gulp.task('default', ['build'], function(){
    runSequence(
        'sync',
        function(){
            gulp.watch('./src/*.html', ['html']);
            gulp.watch('./' + paths.js.src + '/**/*', ['webpack']);
            gulp.watch('./' + paths.css.src + '/**/*.scss', ['styles']);
        });
});

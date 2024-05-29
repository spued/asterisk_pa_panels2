'use strict';
var browserify = require('browserify');
var source = require('vinyl-source-stream');
const dotenv = require("dotenv").config();
const gnodemon = require('gulp-nodemon')
const { watch, task, series, dest } = require('gulp');

task('dev', async () => {
    gnodemon({
      script: "index.js",
      require: '.env',
      ignore: [ 'node_modules/**',
                '**/sessions/**',
                'uploads/**',
                'uploads/stations/**'
              ],
      ext: 'css js ejs',
      verbose: true,
      watch: [ 
               '*.js',
               './*.js',
               './**/*.js',
               './**/**/*.js',
                './public/*',
               './views/**/*.ejs',
               './config/*.*'
            ],
      env: {'NODE_ENV': 'development'}
    });
})
  
task('production', async () => {
  gnodemon({
    script: "index.js",
    require: '.env',
    ignore: ['node_modules/**','views/**/**','./public/**/*.*'],
    ext: 'css js pug',
    verbose: true,
    watch: [ '*.js',
             './*.js',
             './**/*.js',
             './**/**/*.js',
             // './public/css/*.css',
             //'./views/**/*.pug',
             './config/*.*'
          ],
    env: {'NODE_ENV': 'production'}
  });
})

task('browserify', function() {
    var bundler = browserify({
      entries: './public/js/sipclient.js',
      cache: {}, packageCache: {}, fullPaths: true, debug: true
    });
  
    var bundle = function() {
      return bundler
        .bundle()
        .on('error', function () {})
        .pipe(source('bundles.js'))
        .pipe(dest('./public/js/'));
    };
  
    if(global.isWatching) {
      bundler = watchify(bundler);
      bundler.on('update', bundle);
    }
  
    return bundle();
});

task('default', series('browserify','dev'));
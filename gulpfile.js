var gulp = require('gulp'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify-es').default,
    path = require('path'),
    changed = require('gulp-changed'),
    w3cjs = require('gulp-w3cjs'),
    rename = require('gulp-rename'),
    through = require('through2'),
    gutil = require('gulp-util'),
    gulpFilter = require('gulp-filter'),
    expect = require('gulp-expect-file'),
    gulpsync = require('gulp-sync')(gulp),
    ngAnnotate = require('gulp-ng-annotate'),
    PluginError = gutil.PluginError;

// production mode (see build task)
var isProduction = true;
var useSourceMaps = true;

// JS APP
gulp.task('scripts:app', function() {

    var files = ['app/js/app.init.js',
        'app/js/modules/*.js',
        'app/js/modules/controllers/*.js',
        'app/js/modules/directives/*.js',
        'app/js/modules/services/*.js'
    ];

    return gulp.src(files)
        .pipe(gutil.noop())
        .pipe(concat('app.js'))
        .pipe(ngAnnotate())
        .on("error", handleError)
        .pipe(isProduction ? uglify() : gutil.noop())
        .on("error", handleError)
        .pipe(gutil.noop())
        .pipe(gulp.dest('app/js'));
});


gulp.task('scripts:base', function() {

    return gulp.src(require('./base.js.json'))
        .pipe(uglify())
        .pipe(concat('base.js'))
        .pipe(gulp.dest('app/js'));
});

gulp.task('scripts:background', function() {

    return gulp.src(require('./background.js.json'))
        .pipe(isProduction ? uglify() : gutil.noop())
        .pipe(concat('background.js'))
        .pipe(gulp.dest('app/js'));
});


//---------------
// WATCH
//---------------

// Rerun the task when a file changes
gulp.task('watch', function() {
    gulp.watch('app/js/app.init.js', ['scripts:app']);
    gulp.watch('app/js/**/*.js', ['scripts:app']);
    gulp.watch('app/js/background/*.js', ['scripts:background']);
    gulp.watch('app/js/background/services/*.js', ['scripts:background']);
});


// build for production (minify)
gulp.task('build', ['prod', 'default']);
gulp.task('prod', function() {
    isProduction = true;
});

// default (no minify)
gulp.task('default', gulpsync.sync([
    'scripts:base',
    'scripts:background',
    'scripts:app',
    'start'
]), function() {

    gutil.log(gutil.colors.cyan('************'));
    gutil.log(gutil.colors.cyan('* All Done *'), 'You can start editing your code, LiveReload will update your browser after any change..');
    gutil.log(gutil.colors.cyan('************'));

});

gulp.task('start', [
    'watch'
]);

gulp.task('done', function() {
    console.log('All Done!! You can start editing your code, LiveReload will update your browser after any change..');
});

// Error handler
function handleError(err) {
    console.log(err.toString());
    this.emit('end');
}

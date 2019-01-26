const {
    src,
    dest,
    series,
    watch
} = require('gulp')

const concat = require('gulp-concat'),
    uglify = require('gulp-uglify-es').default,
    through2 = require('through2'),
    ngAnnotate = require('gulp-ng-annotate')

let isProduction = false;

const handleError = err => {
    console.log(err.toString())
    this.emit('end')
}

const buildAppJs = cb => {
    src(['app/js/app.init.js',
            'app/js/modules/*.js',
            'app/js/modules/controllers/*.js',
            'app/js/modules/directives/*.js',
            'app/js/modules/services/*.js'
        ])
        .pipe(concat('app.js'))
        .pipe(ngAnnotate())
        .on("error", handleError)
        .pipe(isProduction ? uglify() : through2.obj())
        .on("error", handleError)
        .pipe(dest('app/js'))
    cb()
}

const buildBaseJs = cb => {
    src(require('./base.js.json'))
        .pipe(uglify())
        .pipe(concat('base.js'))
        .pipe(dest('app/js'))
    cb()
}

const buildBackgroundJs = cb => {
    src(require('./background.js.json'))
        .pipe(isProduction ? uglify() : through2.obj())
        .pipe(concat('background.js'))
        .pipe(dest('app/js'))
    cb()
}

// Rerun the task when a file changes
const watchJs = cb => {
    watch(['app/js/app.init.js', 'app/js/**/*.js'], cb => {
        buildAppJs(() => {})
        // cb()
    })

    watch(['app/js/background/*.js', 'app/js/background/services/*.js'], cb => {
        buildBackgroundJs(() => {})
        // cb()
    })

    cb()
}

const build = cb => {
    isProduction = true
    cb()
}

exports.dev = series(buildBaseJs, buildBackgroundJs, buildAppJs, watchJs)
exports.build = series(build, buildBaseJs, buildBackgroundJs, buildAppJs)

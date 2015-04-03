var path = require('path'),
    gulp = require('gulp'),
    browserify = require('browserify'),
    reactify = require('reactify'),
    source = require('vinyl-source-stream'),
    plumber = require('gulp-plumber'),
    sass = require('gulp-sass'),
    rename = require('gulp-rename'),
    livereload = require('gulp-livereload'),
    shell = require('gulp-shell');

var MAIN_JS_FILE = path.join(__dirname, './web-files/javascripts/main.js');
var PUBLIC_JS_DIR = path.join(__dirname, './web-files');

gulp.task('compileJS', function () {

    var b = browserify({
        insertGlobals: true
    }).add(MAIN_JS_FILE).transform(reactify);

    var bundling = b.bundle();

    bundling.on('error', function (err) {
        console.error(err.message);
        bundling.emit('end');
    });

    return bundling
        .pipe(plumber())
        .pipe(source('compiled.js'))
        .pipe(gulp.dest(PUBLIC_JS_DIR));

});

gulp.task('compileCSS', function () {

    return gulp.src('./web-files/sass/main.scss')
        .pipe(plumber())
        .pipe(sass())
        .pipe(rename('style.css'))
        .pipe(gulp.dest('./web-files'))
        .pipe(livereload());

}); 

gulp.task('runGo', shell.task([
    "sh stop.sh",
    'go run *.go &'
]));

gulp.task('default', ["compileJS","compileCSS"], function () {
    livereload.listen();
    gulp.watch('web-files/javascripts/**/*.js', ['compileJS']);
    gulp.watch('web-files/sass/**/*.scss', ['compileCSS']); 
    // gulp.watch('web.go', ['runGo']);
    // look at gulp-go later
});
var gulp = require('gulp');
var sass = require('gulp-sass');
var livereload = require('gulp-livereload');

gulp.task('sass', function () {
    gulp.src('public/stylesheets/*.scss')
        .pipe(sass())
        .pipe(gulp.dest('public/stylesheets/'));
});

gulp.task('default', function() {
	gulp.start('sass');
 	livereload.listen();
	gulp.watch('public/stylesheets/*.scss', function(event) {
		gulp.start('sass');
	})
}) 
var gulp = require('gulp');
var gulpif = require('gulp-if');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var autoprefixer = require('gulp-autoprefixer');
var csscomb = require('gulp-csscomb');
var nunjucksRender = require('gulp-nunjucks-render');
var data = require('gulp-data');
var htmlhint = require("gulp-htmlhint");
var prettify = require('gulp-prettify');
var plumber = require('gulp-plumber');
var notify = require('gulp-notify');
var del = require('del');
var replace = require('gulp-replace');
var useref = require('gulp-useref');
var uglify = require('gulp-uglify');
var minifyCss = require('gulp-minify-css');
var browserSync = require('browser-sync');
var ftp = require( 'vinyl-ftp' );



/*-----------------------------------------------------------------------------------*/
/*  STYLESHEETS
/*-----------------------------------------------------------------------------------*/

	gulp.task('compile-sass', ['clean'], function () { // 'clean' will be guaranteed to complete before this task.
		return gulp.src(['app/styles/sass/main_light.scss', 'app/styles/sass/main_dark.scss']) // Get source files with gulp.src
		.pipe(customPlumber('Error Compiling Sass')) // To avoid breaking 'app-watch' task on error
		.pipe(sourcemaps.init()) // Initiate sourcemaps tracking
		.pipe(sass()) // Sends it through a gulp plugin
		.pipe(autoprefixer()) // Prefix CSS with autoprefixer
		.pipe(browserSync.reload({ stream: true })) // Reload browser if any sass file is compiled
		.pipe(csscomb()) // Format CSS coding style with CSScomb.
		.pipe(sourcemaps.write()) // Write recorded sourcemaps
		.pipe(gulp.dest('app/styles/css/')) // Outputs the file in the destination folder
	});


/*-----------------------------------------------------------------------------------*/
/*  MARKUP
/*-----------------------------------------------------------------------------------*/

	gulp.task('compile-html', ['clean'], function() { // 'clean' will be guaranteed to complete before this task.
		nunjucksRender.nunjucks.configure(['app/markup/templates/']);	
		return gulp.src('app/markup/pages/**/*.+(html|nunjucks)') // Gets .html and .nunjucks files in pages
		.pipe(customPlumber('Error Compiling HTML')) // To avoid breaking 'app-watch' task on error
		.pipe(data(function() { return require('./app/markup/data.json') })) // Adding data to Nunjucks
		.pipe(nunjucksRender()) // Renders template with nunjucks
		.pipe(prettify()) // Format compiled .html files
		.pipe(htmlhint()) // Validates HTML
		.pipe(htmlhint.reporter()) // Report any invalidation error
		.pipe(browserSync.reload({ stream: true })) // Reload browser if any markup file is compiled
		.pipe(gulp.dest('app'))	// output files in app folder
	});


/*-----------------------------------------------------------------------------------*/
/*  WATCH
/*-----------------------------------------------------------------------------------*/

	gulp.task('app-watch', ['compile-sass', 'compile-html', 'app-server'], function() {
		gulp.watch('app/styles/sass/**/*.scss', ['compile-sass']);
		gulp.watch('app/markup/**/*.+(html|nunjucks|json)', ['compile-html']);
	});


/*-----------------------------------------------------------------------------------*/
/*  SERVER
/*-----------------------------------------------------------------------------------*/

	// server for 'app' folder
	gulp.task('app-server', function() {
		browserSync({
			server: {
				baseDir: 'app'
			},
			browser: 'firefox',
			notify: false,
		})
	});

	// server for 'dist' folder
	gulp.task('dist-server', function() {
		browserSync({
			server: {
				baseDir: 'dist'
			},
			browser: 'firefox',
			notify: false,
		})
	});

	// server for 'deploy' folder
	gulp.task('deploy-server', function() {
		browserSync({
			server: {
				baseDir: 'deploy'
			},
			browser: 'firefox',
			notify: false,
		})
	});


/*-----------------------------------------------------------------------------------*/
/*  DISTRIBUTION
/*-----------------------------------------------------------------------------------*/

	gulp.task('dist-folder', function() {
		return gulp.src(['app/**/*', '!app/{markup,markup/**}', '!app/images/{demo,demo/**}'])
		.pipe(gulpif('*.html', replace('images/demo/', 'images/dist/'))) // replace demo images path
		.pipe(gulp.dest('dist'))	// output files in dist folder
	});


/*-----------------------------------------------------------------------------------*/
/*  DEPLOYMENT
/*-----------------------------------------------------------------------------------*/

	gulp.task('deploy-folder', function() {
		return gulp.src(['app/**/*', '!app/{markup,markup/**}', '!app/images/{dist,dist/**}', '!app/styles/{sass,sass/**}'])
		.pipe(gulpif('*.html', replace('UA-XXXXX-X', 'UA-52380361-10'))) // replace GA unique code
		.pipe(gulpif('*.html', useref())) // replace refrences to unoptimized resources
		.pipe(gulpif('*.js', uglify())) // Minify JS files with UglifyJS
		.pipe(gulpif('*.css', minifyCss({compatibility: 'ie9'}))) // Minify CSS files with clean-css
		.pipe(gulp.dest('deploy'))	// output files in deploy folder
		// Image Optimize and Sprite or Data URIs
		// Upload to server through FTP		
	});

	gulp.task( 'upload', ['deploy-folder'], function () {
	 
		// FTP Credentials
		var conn = ftp.create( {
			host:     'domain.com',
			user:     'username',
			password: '*********',
			parallel: 10
		} );
	 	 
		return gulp.src( ['deploy/**/*'], { base: 'deploy/', buffer: false } )
			.pipe( conn.newer( '/public_html/html.themeshash.com/project' ) ) // only upload newer files 
			.pipe( conn.dest( '/public_html/html.themeshash.com/project' ) );
	 
	} );


/*-----------------------------------------------------------------------------------*/
/*  HELPERS
/*-----------------------------------------------------------------------------------*/

	gulp.task('clean', function() {
		return del(['dist', 'deploy']);
	});

	gulp.task('default', ['compile-sass', 'compile-html'], function() { // 'compile-sass' and 'compile-html' will be processed in parallel.
		gulp.start(['app-watch', 'app-server']);
	});

	gulp.task('build', ['compile-sass', 'compile-html'], function() {
		gulp.start(['dist-folder', 'dist-server']);
	});

	gulp.task('deploy', ['compile-sass', 'compile-html'], function() {
		gulp.start(['deploy-folder', 'deploy-server']);
	});



/*-----------------------------------------------------------------------------------*/
/*  CUSTOM FUNCTIONS
/*-----------------------------------------------------------------------------------*/

	// Error Handling
	function customPlumber(errTitle) {
		return plumber({
			errorHandler: notify.onError({
				title: errTitle || "Error running Gulp",
				message: "Error: <%= error.message %>",
				sound: false
			})			
		});
	}

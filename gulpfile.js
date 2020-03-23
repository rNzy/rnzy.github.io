// Features
const settings = {
  clean: true,
  scripts: true,
  polyfills: true,
  styles: true,
  imgs: true,
  html: true,
  reload: true,
  deploy: true
};

// Paths
const paths = {
  input: "src/",
  output: "dist/",
  scripts: {
    input: "src/js/*",
    polyfills: ".polyfill.js",
    output: "dist/js/"
  },
  styles: {
    input: "src/sass/**/*.{scss,sass}",
    output: "dist/css/"
  },
  imgs: {
    input: "src/img/*.png",
    output: "dist/img/"
  },
  html: {
    input: "src/html/**/*",
    output: "dist/"
  },
  reload: "./dist/"
};

// Banner content
const banner = {
  main:
    "/*!" +
    " <%= package.name %> v<%= package.version %>" +
    " | (c) " +
    new Date().getFullYear() +
    " <%= package.author.name %>" +
    " | <%= package.license %> License" +
    " | <%= package.repository.url %>" +
    " */\n"
};

// General
const { gulp, src, dest, watch, series, parallel } = require("gulp");
const del = require("del");
const flatmap = require("gulp-flatmap");
const lazypipe = require("lazypipe");
const rename = require("gulp-rename");
const header = require("gulp-header");
const package = require("./package.json");

// Scripts
const jshint = require("gulp-jshint");
const stylish = require("jshint-stylish");
const concat = require("gulp-concat");
const uglify = require("gulp-terser");
const optimizejs = require("gulp-optimize-js");

// Styles
const sass = require("gulp-sass");
const postcss = require("gulp-postcss");
const purgecss = require("gulp-purgecss");
const prefix = require("autoprefixer");
const minify = require("cssnano");

// IMGS
const imagemin = require("gulp-imagemin");

// BrowserSync
const browserSync = require("browser-sync");

// Deploy
const deploy = require("gulp-gh-pages");

// Remove pre-existing content from output folders
const cleanDist = function(done) {
  // Make sure this feature is activated before running
  if (!settings.clean) return done();

  // Clean the dist folder
  del.sync([paths.output]);

  // Signal completion
  return done();
};

// Repeated JavaScript tasks
const jsTasks = lazypipe()
  .pipe(header, banner.main, { package: package })
  .pipe(optimizejs)
  .pipe(dest, paths.scripts.output)
  .pipe(rename, { suffix: ".min" })
  .pipe(uglify)
  .pipe(optimizejs)
  .pipe(header, banner.main, { package: package })
  .pipe(dest, paths.scripts.output);

// Lint, minify, and concatenate scripts
const buildScripts = function(done) {
  // Make sure this feature is activated before running
  if (!settings.scripts) return done();

  // Run tasks on script files
  return src(paths.scripts.input).pipe(
    flatmap(function(stream, file) {
      // If the file is a directory
      if (file.isDirectory()) {
        // Setup a suffix constiable
        const suffix = "";

        // If separate polyfill files enabled
        if (settings.polyfills) {
          // Update the suffix
          suffix = ".polyfills";

          // Grab files that aren't polyfills, concatenate them, and process them
          src([
            file.path + "/*.js",
            "!" + file.path + "/*" + paths.scripts.polyfills
          ])
            .pipe(concat(file.relative + ".js"))
            .pipe(jsTasks());
        }

        // Grab all files and concatenate them
        // If separate polyfills enabled, this will have .polyfills in the filename
        src(file.path + "/*.js")
          .pipe(concat(file.relative + suffix + ".js"))
          .pipe(jsTasks());

        return stream;
      }

      // Otherwise, process the file
      return stream.pipe(jsTasks());
    })
  );
};

// Lint scripts
const lintScripts = function(done) {
  // Make sure this feature is activated before running
  if (!settings.scripts) return done();

  // Lint scripts
  return src(paths.scripts.input)
    .pipe(jshint())
    .pipe(jshint.reporter("jshint-stylish"));
};

// Process, lint, and minify Sass files
const buildStyles = function(done) {
  // Make sure this feature is activated before running
  if (!settings.styles) return done();

  // Run tasks on all Sass files
  return src(paths.styles.input)
    .pipe(
      sass({
        outputStyle: "expanded"
      })
    )
    .pipe(
      postcss([
        prefix({
          cascade: true,
          remove: true
        })
      ])
    )
    .pipe(header(banner.main, { package: package }))
    .pipe(dest(paths.styles.output))
    .pipe(rename({ suffix: ".min" }))
    .pipe(purgecss({ content: ["src/**/*.html"] }))
    .pipe(
      postcss([
        minify({
          discardComments: {
            removeAll: true
          }
        })
      ])
    )
    .pipe(dest(paths.styles.output));
};

// Optimize images files
const buildImages = function(done) {
  // Make sure this feature is activated before running
  if (!settings.imgs) return done();

  // Optimize image files
  return src(paths.imgs.input)
    .pipe(imagemin())
    .pipe(dest(paths.imgs.output));
};

// Copy static files into output folder
const copyFiles = function(done) {
  // Make sure this feature is activated before running
  if (!settings.html) return done();

  // Copy static files
  return src(paths.html.input).pipe(dest(paths.html.output));
};

// Watch for changes to the src directory
const startServer = function(done) {
  // Make sure this feature is activated before running
  if (!settings.reload) return done();

  // Initialize BrowserSync
  browserSync.init({
    server: {
      baseDir: paths.reload
    }
  });

  // Signal completion
  done();
};

// Reload the browser when files change
const reloadBrowser = function(done) {
  if (!settings.reload) return done();
  browserSync.reload();
  done();
};

// Watch for changes
const watchSource = function(done) {
  watch(paths.input, series(exports.default, reloadBrowser));
  done();
};

// Deploy
const deployPage = function(done) {
  if (!settings.deploy) return done();
  return src("./dist/**/*").pipe(deploy());
};

// Default task
// gulp
exports.default = series(
  cleanDist,
  parallel(buildScripts, lintScripts, buildStyles, buildImages, copyFiles)
);

// Watch and reload
// gulp watch
exports.watch = series(exports.default, startServer, watchSource);

exports.deploy = series(exports.default, deployPage);

const { src, dest, task } = require('gulp');
const path = require('path');

task('build:icons', function() {
  return src('./src/nodes/Hubitat/*.svg')
    .pipe(dest('./dist/nodes/Hubitat/'));
});

task('default', task('build:icons'));

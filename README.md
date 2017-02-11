fusebox-adapter-plugin
======================
Adapt gulp plugins, browserify transforms and streams to work with fuse-box.

## Usage
```js
const fsbx = require('fuse-box');
const g = require('gulp-load-plugins')();
const { AdapterPlugin } = require('fusebox-adapter-plugin');

const fuseBox = fsbx.FuseBox.init({
    homeDir: 'src',
    outFile: 'build/app.js',
    plugins: [
        // Other fusebox plugins...
        AdapterPlugin([
        	(file) => g.replace('foo', 'bar'),
        	// Other plugins, transforms, streams...
        ])
    ]
});
```

**Note:**
AdapterPlugin will be applicable to all files, so you must control type of transform by `ChainPlugin`
(see examples below).

**Gulp plugins note:**
You can use only those plugins which only manipulates `contents` property of vinyl file.  
Applying of some plugins, like `gulp-rename`, does not make sense,
because they do not affect `contents`, but others - path, dirname, etc.

### API
```js
class AdapterPlugin {
    constructor(streams: ((file: File) => any)[]);
}
```

### Examples

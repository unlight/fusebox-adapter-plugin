import { test } from 'ava';
import { AdapterPlugin, VINYL, OBJECT, TEXT } from './index';
import { FuseBox, RawPlugin, HTMLPlugin, JSONPlugin } from 'fuse-box';
const g = require('gulp-load-plugins')();
const through = require('through2');
const envify = require('envify/custom');

function fuseBoxBundle(files, plugins: any[], bundleStr = '**/*.*'): Promise<any> {
    return new Promise((resolve, reject) => {
        let fuseBox = new FuseBox({
            log: false,
            cache: false,
            plugins: plugins,
            files: files
        });
        fuseBox.bundle(bundleStr)
            .then(data => {
                if (!data || !data.content) return reject(new Error('bundle content empty'));
                let scope = { navigator: 1 };
                let str = data.content.toString();
                str = str.replace(/\(this\)\)$/, "(__root__))");
                try {
                    let fn = new Function("window", "__root__", str);
                    fn(scope, scope);
                } catch (err) {
                    var pos = str.indexOf('(function(e){var r="undefined"!=typeof window&&window.navigator');
                    if (pos !== -1) {
                        var content = str.slice(0, pos);
                        console.error(content);
                    }
                    return reject(err);
                }
                return resolve(scope);
            })
            .catch(err => {
                reject(err);
            });
    });
}

test('smoke', t => {
    t.truthy(AdapterPlugin);
});

test('fusebox bundle', async t => {
    let {FuseBox} = await fuseBoxBundle({
        './a.js': `module.exports = 1`,
    }, []);
    let result = FuseBox.import('./a.js');
    t.is(result, 1);
});

test('gulp replace', async t => {
    const plugins = [
        AdapterPlugin([
            (file) => [VINYL, g.replace('foo', 'bar')]
        ])
    ];
    let {FuseBox} = await fuseBoxBundle({
        './foo.js': `module.exports = 'foo'`,
    }, plugins);
    let foo = FuseBox.import('./foo');
    t.is(foo, 'bar');
});

test('gulp replace inject-string', async t => {
    const plugins = [
        AdapterPlugin([
            (file) => g.replace('foo', 'bar'),
            (file) => g.injectString.append(`exports.b = 'buz';`),
        ])
    ];
    let {FuseBox} = await fuseBoxBundle({
        './foo.js': `exports.f = 'foo';`,
    }, plugins);
    let {f, b} = FuseBox.import('./foo');
    t.is(f, 'bar');
    t.is(b, 'buz');
});

test('gulp markdown', async t => {
    const plugins = [
        [
            /\.md$/,
            AdapterPlugin([
                () => g.markdown()
            ]),
            RawPlugin({ extensions: ['.md'] }),
        ]
    ];
    let {FuseBox} = await fuseBoxBundle({
        './app.ts': `exports.doc = require('./doc.md')`,
        './doc.md': `# header`,
    }, plugins);
    let {doc} = FuseBox.import('./app.ts');
    t.is(doc, `<h1 id="header">header</h1>\n`);
});

test('gulp json5', async t => {
    const plugins = [
        [
            /\.json5$/,
            {
                init: (k) => k.allowExtension('.json5')
            },
            AdapterPlugin([
                (file) => [VINYL, g.json5()],
            ]),
            JSONPlugin({}),
        ]
    ];
    var {FuseBox} = await fuseBoxBundle({
        './foo.json5': `{foo:1}`,
        './app.js': `exports.data = require('./foo.json5')`,
    }, plugins);
    let foo = FuseBox.import('./foo.json5');
    t.deepEqual(foo, { foo: 1 });
    let app = FuseBox.import('./app.js');
    t.deepEqual(app.data, { foo: 1 });
});

test('text envify', async t => {
    const plugins = [
        AdapterPlugin([
            (file) => [TEXT, envify({ MY_ENV: 'dev' })]
        ])
    ];
    let {FuseBox} = await fuseBoxBundle({
        './entry.js': `module.exports = process.env.MY_ENV`,
    }, plugins);
    let entry = FuseBox.import('./entry');
    t.is(entry, 'dev');
});

test('text and gulp', async t => {
    const plugins = [
        AdapterPlugin([
            (file) => [TEXT, envify({ MY_ENV: 'dev' })],
            (file) => [VINYL, g.replace('dev', 'development')],
        ])
    ];
    let {FuseBox} = await fuseBoxBundle({
        './entry.js': `module.exports = process.env.MY_ENV`,
    }, plugins);
    let entry = FuseBox.import('./entry');
    t.is(entry, 'development');
});

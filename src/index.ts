import { WorkFlowContext } from 'fuse-box';
import { Plugin } from 'fuse-box/dist/typings/WorkflowContext';
import { File } from 'fuse-box/dist/typings/File';
import { Transform, Writable } from 'stream';
import { findAdapter } from './utils';
import { relative } from 'path';
import { StreamFactory } from './types';
const toSrc = require('toSrc');
const toString = require('stream-to-string');
const pumpify = require('pumpify');
const cwfile = relative(process.cwd(), __filename).replace(/\\/g, '/');

export function AdapterPlugin(streams: StreamFactory[]) {
    return new FuseBoxAdapterPlugin(streams);
}

export class FuseBoxAdapterPlugin implements Plugin {

    constructor(
        private streams: StreamFactory[]
    ) {
    }

    transform(file: File) {
        if (file.collection.name !== 'default') {
            return;
        }
        const useCache = false; // TODO: Fix me.
        const context = file.context;

        if (useCache) {
            let cached = context.cache.getStaticCache(file);
            if (cached) {
                file.analysis.skip();
                file.analysis.dependencies = cached.dependencies;
                file.contents = cached.contents;
                return;
            }
        }

        file.loadContents();

        const input = new Writable({ objectMode: true });
        const streams: any[] = [input];
        this.streams.forEach(create => {
            const unknown = create(file);
            const adapter = findAdapter(unknown);
            if (!adapter) {
                console.warn(`${cwfile}: Unknown type of stream: ${toSrc(unknown)}`);
                return;
            }
            streams.push(adapter.adapt(unknown));
        });
        const pipeline = pumpify.obj(streams);
        input.write(file.contents);
        input.end();

        return toString(pipeline, (err, result) => {
            file.contents = result;
            // TODO: Do we need writeStaticCache?
            // Seems no, because writeStaticCache is called before tryPlugins
            if (useCache) {
                context.cache.writeStaticCache(file, null);
            }
        });
    }
}

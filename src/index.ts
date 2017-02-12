import { WorkFlowContext } from 'fuse-box';
import { Plugin } from 'fuse-box/dist/typings/WorkflowContext';
import { File } from 'fuse-box/dist/typings/File';
import { PassThrough } from 'stream';
import { StreamFactory, StreamInfo } from './types';
import { createTransformFactory } from './utils';
const toString = require('stream-to-string');
const pumpify = require('pumpify');

export const VINYL = Symbol('VINYL');
export const TRANSFORM = Symbol('TRANSFORM');
export const TEXT = Symbol('STREAM');

export function AdapterPlugin(streamFactories: StreamFactory[]) {
    return new FuseBoxAdapterPlugin(streamFactories);
}

export class FuseBoxAdapterPlugin implements Plugin {

    test = /.*/;

    constructor(
        private streamFactories: StreamFactory[]
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

        const input = new PassThrough({ objectMode: true });
        const streams: StreamInfo[] = [[TRANSFORM, input]];
        this.streamFactories.forEach(create => {
            const [type, stream] = create(file);
            const [[prevType, prevStream]] = streams.slice(-1);
            if (prevType !== type) {
                const transformFactory = createTransformFactory(prevType, type);
                const transform = transformFactory();
                streams.push([type, transform]);
            }
            streams.push([type, stream]);
        });

        const [[prevType, prevStream]] = streams.slice(-1);
        if (prevType !== TRANSFORM) {
            const transform = createTransformFactory(prevType, TRANSFORM)();
            streams.push([TRANSFORM, transform]);
        }

        const pipeline = pumpify.obj(streams.map(([type, stream]) => stream));
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

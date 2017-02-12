import { WorkFlowContext } from 'fuse-box';
import { Plugin } from 'fuse-box/dist/typings/WorkflowContext';
import { File } from 'fuse-box/dist/typings/File';
import { Transform, PassThrough } from 'stream';
import { createTransformFactory } from './utils';
import toString = require('stream-to-string');
import pumpify = require('pumpify');
import isStream = require('is-stream');
import { relative } from 'path';
import toSrc = require('toSrc');
const cwfile = relative(process.cwd(), __filename).replace(/\\/g, '/');

export const VINYL = Symbol('VINYL');
export const OBJECT = Symbol('OBJECT');
export const TEXT = Symbol('TEXT');

export type StreamInfo = [symbol, Transform];
export type StreamFactory = ((file: File) => StreamInfo);

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
        const streamTuples: StreamInfo[] = [[OBJECT, input]];
        this.streamFactories.forEach(create => {
            let result = create(file);
            let type = VINYL, stream: Transform;
            if (Array.isArray(result)) {
                [type, stream] = result;
            } else {
                stream = result;
            }
            if (type === TEXT && !isStream.transform(stream) && typeof stream === 'function') {
                // Looks like browserify transform.
                stream = stream(file.absPath);
                if (!isStream(stream)) {
                    console.warn(`${cwfile}: Cannot adapt stream ${toSrc(stream)}.`);
                    return;
                }
            }
            const [[prevType, prevStream]] = streamTuples.slice(-1);
            if (prevType !== type) {
                const transformFactory = createTransformFactory(prevType, type);
                const transform = transformFactory(file.absPath);
                streamTuples.push([type, transform]);
            }
            streamTuples.push([type, stream]);
        });
        const [[prevType, prevStream]] = streamTuples.slice(-1);
        if (prevType !== OBJECT) {
            const transform = createTransformFactory(prevType, OBJECT)(file.absPath);
            streamTuples.push([OBJECT, transform]);
        }
        const streams = streamTuples.map(([type, stream]) => stream);
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

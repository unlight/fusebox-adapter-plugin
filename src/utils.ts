import { Transform } from 'stream';
import { TEXT, TRANSFORM, VINYL } from './index';
import { TransformAdapter } from './types';
import { relative } from 'path';
import toSrc = require('toSrc');
import Vinyl = require('vinyl');
const cwfile = relative(process.cwd(), __filename).replace(/\\/g, '/');

export function createTransformFactory(prevType: symbol, nextType: symbol) {
    if (prevType == VINYL && nextType === TRANSFORM) return vinylToObject;
    else if (prevType == TRANSFORM && nextType === VINYL) return objectToVinyl;
    throw new Error(`${cwfile}: Cannot create pipe adapter from ${toSrc(prevType)} to ${toSrc(nextType)}.`);
}

export function objectToVinyl() {
    return new Transform({
        objectMode: true,
        transform(chunk: string | Buffer, encoding: string, callback: Function) {
            let vinyl = new Vinyl({
                path: '/dev/null',
                contents: (chunk instanceof Buffer) ? chunk : Buffer.from(chunk)
            });
            callback(null, vinyl);
        }
    });
}

export function vinylToObject() {
    return new Transform({
        objectMode: true,
        transform(chunk: any | Vinyl, encoding: string, callback: Function) {
            callback(null, chunk.contents.toString());
        }
    });
}

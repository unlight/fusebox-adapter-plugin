import { Transform } from 'stream';
import { TEXT, OBJECT, VINYL } from './index';
import Vinyl = require('vinyl');
import { relative } from 'path';
const cwfile = relative(process.cwd(), __filename).replace(/\\/g, '/');

export type TransformFactory = (abspath: string) => Transform;

export function createTransformFactory(prevType: symbol, nextType: symbol): TransformFactory {
    if (prevType === VINYL && nextType === OBJECT) return vinylToObject;
    else if (prevType === OBJECT && nextType === VINYL) return toVinyl;
    else if (prevType === TEXT && nextType === VINYL) return toVinyl;
    else if (prevType === OBJECT && nextType === TEXT) return objectToText;
    else if (prevType === TEXT && nextType === OBJECT) return textToObject;
    throw new Error(`${cwfile}: Cannot create pipe adapter from ${String(prevType)} to ${String(nextType)}.`);
}

export function objectToText(abspath: string) {
    return new Transform({
        transform(chunk: string | Buffer, encoding: string, callback: Function) {
            callback(null, String(chunk));
        }
    });
}

export function textToObject(abspath: string) {
    let contents = '';
    return new Transform({
        objectMode: true,
        transform(chunk: string | Buffer, encoding: string, callback: Function) {
            contents += String(chunk);
            callback();
        },
        flush(callback: Function) {
            callback(null, contents);
        }
    });
}

export function toVinyl(abspath: string) {
    let contents = '';
    return new Transform({
        objectMode: true,
        transform(chunk: string | Buffer, encoding: string, callback: Function) {
            contents += String(chunk);
            callback();
        },
        flush(callback: Function) {
            const vinyl = new Vinyl({
                path: abspath,
                contents: Buffer.from(contents)
            });
            callback(null, vinyl);
        }
    });
}

export function vinylToObject(abspath: string) {
    return new Transform({
        objectMode: true,
        transform(chunk: any | Vinyl, encoding: string, callback: Function) {
            callback(null, chunk.contents.toString());
        }
    });
}

import { Transform } from 'stream';
import { File } from 'fuse-box/dist/typings/File';

export type StreamInfo = [symbol, Transform];
export type StreamFactory = ((file: File) => StreamInfo);

export interface TransformAdapter {
    text();
    vinyl();
    transform();
};

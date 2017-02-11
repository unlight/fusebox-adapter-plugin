import { Transform } from 'stream';
import { File } from 'fuse-box/dist/typings/File';

export interface Checker {
	isRelevant(unknown): boolean;
	adapt(unknown): Transform;
}

export type StreamFactory = ((file: File) => any);

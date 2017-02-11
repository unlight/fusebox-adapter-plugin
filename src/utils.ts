import { browserify } from './browserify';
import { transform } from './transform';
import { vinyl } from './vinyl';
import { Checker } from './types';

const adapters: Checker[] = [
	vinyl,
	browserify,
	transform,
];

export function findAdapter(unknown: any) {
	const result = adapters.find(x => x.isRelevant(unknown));
	return result;
}

import { Transform } from 'stream';
import { Checker } from './types';
const isStream = require('is-stream');

export const transform: Checker = {
	
	isRelevant(tr): boolean {
		return isStream.transform(tr);
	},
	
	adapt(tr): Transform {
		return tr;
	},
};
import { Checker } from './types';

export const browserify: Checker = {

	isRelevant(unknown): boolean {
		if (typeof unknown === 'function') {

        }
        return false;
	},

	adapt(tr) {
	},
}

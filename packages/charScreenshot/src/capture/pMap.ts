import {AggregateError} from './aggregateError';

export interface Options {
    /**
     Number of concurrently pending promises returned by `mapper`.

     Must be an integer from 1 and up or `Infinity`.

     @default Infinity
     */
    readonly concurrency?: number;

    /**
     When set to `false`, instead of stopping when a promise rejects, it will wait for all the promises to settle and then reject with an [aggregated error](https://github.com/sindresorhus/aggregate-error) containing all the errors from the rejected promises.

     @default true
     */
    readonly stopOnError?: boolean;
}

/**
 Function which is called for every item in `input`. Expected to return a `Promise` or value.

 @param element - Iterated element.
 @param index - Index of the element in the source array.
 */
export type Mapper<Element = any, NewElement = unknown> = (element: Element, index: number) => NewElement | Promise<NewElement>;

/**
 @param iterable
 @param mapper - Function which is called for every item in `input`. Expected to return a `Promise` or value.
 @param options
 @returns A `Promise` that is fulfilled when all promises in `input` and ones returned from `mapper` are fulfilled, or rejects if any of the promises reject. The fulfilled value is an `Array` of the fulfilled values returned from `mapper` in `input` order.

 @example
 ```
 import pMap from 'p-map';
 import got from 'got';

 const sites = [
 getWebsiteFromUsername('https://sindresorhus'), //=> Promise
 'https://avajs.dev',
 'https://github.com'
 ];

 const mapper = async site => {
	const {requestUrl} = await got.head(site);
	return requestUrl;
};

 const result = await pMap(sites, mapper, {concurrency: 2});

 console.log(result);
 //=> ['https://sindresorhus.com/', 'https://avajs.dev/', 'https://github.com/']
 ```
 */
export async function pMap<Element, NewElement>(
    iterable: Iterable<Element>,
    mapper: Mapper<Element, NewElement>,
    options?: Options
): Promise<NewElement[]> {
    const concurrency = options?.concurrency || Number.POSITIVE_INFINITY
    const stopOnError = options?.stopOnError || true

    return new Promise((resolve, reject) => {
        if (typeof mapper !== 'function') {
            throw new TypeError('Mapper function is required');
        }

        if (!((Number.isSafeInteger(concurrency) || concurrency === Number.POSITIVE_INFINITY) && concurrency >= 1)) {
            throw new TypeError(`Expected \`concurrency\` to be an integer from 1 and up or \`Infinity\`, got \`${concurrency}\` (${typeof concurrency})`);
        }

        const result: NewElement[] = [];
        const errors: AggregateError[] = [];
        const iterator = iterable[Symbol.iterator]();
        let isRejected = false;
        let isIterableDone = false;
        let resolvingCount = 0;
        let currentIndex = 0;

        const next = () => {
            if (isRejected) {
                return;
            }

            const nextItem = iterator.next();
            const index = currentIndex;
            currentIndex++;

            if (nextItem.done) {
                isIterableDone = true;

                if (resolvingCount === 0) {
                    if (!stopOnError && errors.length > 0) {
                        reject(new AggregateError(errors));
                    } else {
                        resolve(result);
                    }
                }

                return;
            }

            resolvingCount++;

            (async () => {
                try {
                    const element = await nextItem.value;
                    result[index] = await mapper(element, index);
                    resolvingCount--;
                    next();
                } catch (error) {
                    if (stopOnError) {
                        isRejected = true;
                        reject(error);
                    } else {
                        errors.push(error);
                        resolvingCount--;
                        next();
                    }
                }
            })();
        };

        for (let index = 0; index < concurrency; index++) {
            next();

            if (isIterableDone) {
                break;
            }
        }
    });
}

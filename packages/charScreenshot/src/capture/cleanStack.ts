import os from 'os';

import {escapeStringRegexp} from './escapeStringRegexp';

const extractPathRegex = /\s+at.*[(\s](.*)\)?/;
const pathRegex = /^(?:(?:(?:node|node:[\w/]+|(?:(?:node:)?internal\/[\w/]*|.*node_modules\/(?:babel-polyfill|pirates)\/.*)?\w+)(?:\.js)?:\d+:\d+)|native)/;
const homeDir = typeof os.homedir === 'undefined' ? '' : os.homedir().replace(/\\/g, '/');

export interface Options {
    /**
     Prettify the file paths in the stack:

     `/Users/sindresorhus/dev/clean-stack/unicorn.js:2:15` → `~/dev/clean-stack/unicorn.js:2:15`

     @default false
     */
    readonly pretty?: boolean;

    /**
     Remove the given base path from stack trace file paths, effectively turning absolute paths into relative ones.

     Example with `'/Users/sindresorhus/dev/clean-stack/'` as `basePath`:

     `/Users/sindresorhus/dev/clean-stack/unicorn.js:2:15` → `unicorn.js:2:15`
     */
    readonly basePath?: string;
}

/**
 Clean up error stack traces. Removes the mostly unhelpful internal Node.js entries.

 @param stack - The `stack` property of an `Error`.
 @param options
 @returns The cleaned stack or `undefined` if the given `stack` is `undefined`.

 @example
 ```
 import cleanStack from 'clean-stack';

 const error = new Error('Missing unicorn');

 console.log(error.stack);

 // Error: Missing unicorn
 //     at Object.<anonymous> (/Users/sindresorhus/dev/clean-stack/unicorn.js:2:15)
 //     at Module._compile (module.js:409:26)
 //     at Object.Module._extensions..js (module.js:416:10)
 //     at Module.load (module.js:343:32)
 //     at Function.Module._load (module.js:300:12)
 //     at Function.Module.runMain (module.js:441:10)
 //     at startup (node.js:139:18)

 console.log(cleanStack(error.stack));

 // Error: Missing unicorn
 //     at Object.<anonymous> (/Users/sindresorhus/dev/clean-stack/unicorn.js:2:15)
 ```
 */
export function cleanStack(stack: string | undefined, options?: Options): string | undefined {
    const pretty = options?.pretty || false
    const basePath = options?.basePath

    const basePathRegex = basePath && new RegExp(`(at | \\()${escapeStringRegexp(basePath.replace(/\\/g, '/'))}`, 'g');

    if (typeof stack !== 'string') {
        return undefined;
    }

    return stack.replace(/\\/g, '/')
        .split('\n')
        .filter(line => {
            const pathMatches = line.match(extractPathRegex);
            if (pathMatches === null || !pathMatches[1]) {
                return true;
            }

            const match = pathMatches[1];

            // Electron
            if (
                match.includes('.app/Contents/Resources/electron.asar') ||
                match.includes('.app/Contents/Resources/default_app.asar')
            ) {
                return false;
            }

            return !pathRegex.test(match);
        })
        .filter(line => line.trim() !== '')
        .map(line => {
            if (basePathRegex) {
                line = line.replace(basePathRegex, '$1');
            }

            if (pretty) {
                line = line.replace(extractPathRegex, (m, p1) => m.replace(p1, p1.replace(homeDir, '~')));
            }

            return line;
        })
        .join('\n');
}

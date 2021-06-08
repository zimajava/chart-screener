import path from 'path';

export interface Options {
    /**
     Passing `false` will make it not call `path.resolve()` on the path.

     @default true
     */
    readonly resolve?: boolean;
}

/**
 Convert a file path to a file URL.

 @param filePath - File path to convert.
 @param options
 @returns The `filePath` converted to a file URL.

 @example
 ```
 import fileUrl from 'file-url';

 fileUrl('unicorn.jpg');
 //=> 'file:///Users/sindresorhus/dev/file-url/unicorn.jpg'

 fileUrl('/Users/pony/pics/unicorn.jpg');
 //=> 'file:///Users/pony/pics/unicorn.jpg'

 fileUrl('unicorn.jpg', {resolve: false});
 //=> 'file:///unicorn.jpg'
 ```
 */
export function fileUrl(filePath, options: Options = {}) {
    if (typeof filePath !== 'string') {
        throw new TypeError(`Expected a string, got ${typeof filePath}`);
    }

    const {resolve = true} = options;

    let pathName = filePath;
    if (resolve) {
        pathName = path.resolve(filePath);
    }

    pathName = pathName.replace(/\\/g, '/');

    // Windows drive letter must be prefixed with a slash.
    if (pathName[0] !== '/') {
        pathName = `/${pathName}`;
    }

    // Escape required characters for path components.
    // See: https://tools.ietf.org/html/rfc3986#section-3.3
    return encodeURI(`file://${pathName}`).replace(/[?#]/g, encodeURIComponent);
}

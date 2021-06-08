/* global document */
import {promises as fs} from 'fs';
import puppeteer, {
    LaunchOptions,
    Page,
    Browser,
    EvaluateFn,
    Protocol,
    BrowserLaunchArgumentOptions,
    BrowserConnectOptions, Product
} from 'puppeteer';
import toughCookie from 'tough-cookie';

import {fileUrl} from './fileUrl';

export interface Authentication {
    readonly username: string;
    readonly password?: string;
}

export type BeforeScreenshot = (page: Page, browser: Browser) => void;

export interface Clip {
    x: number
    y: number
    width: number
    height: number
}

export interface ScrollToElementOptions {
    /**
     A [CSS selector](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors).
     */
    readonly element: string;

    /**
     Offset origin.
     */
    readonly offsetFrom: 'top' | 'right' | 'bottom' | 'left';

    /**
     Offset in pixels.
     */
    readonly offset: number;
}

export interface Options {
    /**
     Input type.

     @default url
     */
    readonly inputType?: 'url' | 'html';

    /**
     Page width.

     @default 1280
     */
    readonly width?: number;

    /**
     Page height.

     @default 800
     */
    readonly height?: number;

    /**
     Image type.

     @default png
     */
    type?: 'png' | 'jpeg';

    /**
     Image quality. Only for {type: 'jpeg'}.

     @default 1
     */
    quality?: number;

    /**
     Scale the webpage `n` times.

     The default is what you would get if you captured a normal screenshot on a computer with a retina (High DPI) screen.

     @default 2
     */
    readonly scaleFactor?: number;

    /**
     Make it look like the screenshot was taken on the specified device.

     This overrides the `width`, `height`, `scaleFactor`, and `userAgent` options.

     @example
     ```
     import captureWebsite from 'capture-website';

     await captureWebsite.file('https://sindresorhus.com', 'screenshot.png', {
		emulateDevice: 'iPhone X'
	});
     ```
     */
    readonly emulateDevice?: string;

    /**
     Capture the full scrollable page, not just the viewport.

     @default false
     */
    fullPage?: boolean;

    /**
     Include the default white background.

     Disabling this lets you capture screenshots with transparency.

     @default true
     */
    readonly defaultBackground?: boolean;

    /**
     The number of seconds before giving up trying to load the page.

     Specify `0` to disable the timeout.

     @default 60
     */
    readonly timeout?: number;

    /**
     The number of seconds to wait after the page finished loading before capturing the screenshot.

     This can be useful if you know the page has animations that you like it to finish before capturing the screenshot.

     @default 0
     */
    readonly delay?: number;

    /**
     Wait for a DOM element matching the given [CSS selector](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors) to appear in the page and to be visible before capturing the screenshot. It times out after `options.timeout` seconds.
     */
    readonly waitForElement?: string;

    /**
     Capture the DOM element matching the given [CSS selector](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors). It will wait for the element to appear in the page and to be visible. It times out after `options.timeout` seconds. Any actions performed as part of `options.beforeScreenshot` occur before this.
     */
    readonly element?: string;

    /**
     Hide DOM elements matching the given [CSS selector](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors).

     Can be useful for cleaning up the page.

     This sets [`visibility: hidden`](https://stackoverflow.com/a/133064/64949) on the matched elements.

     @example
     ```
     import captureWebsite from 'capture-website';

     await captureWebsite.file('https://sindresorhus.com', 'screenshot.png', {
		hideElements: [
			'#sidebar',
			'img.ad'
		]
	});
     ```
     */
    readonly hideElements?: string[];

    /**
     Remove DOM elements matching the given [CSS selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors).

     This sets [`display: none`](https://stackoverflow.com/a/133064/64949) on the matched elements, so it could potentially break the website layout.
     */
    readonly removeElements?: string[];

    /**
     Click the DOM element matching the given [CSS selector](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors).
     */
    readonly clickElement?: string;

    /**
     Scroll to the DOM element matching the given [CSS selector](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors).
     */
    readonly scrollToElement?: string | ScrollToElementOptions;

    /**
     Disable CSS [animations](https://developer.mozilla.org/en-US/docs/Web/CSS/animation) and [transitions](https://developer.mozilla.org/en-US/docs/Web/CSS/transition).

     @default false
     */
    readonly disableAnimations?: boolean;

    /**
     Whether JavaScript on the website should be executed.

     This does not affect the `scripts` and `modules` options.

     @default true
     */
    readonly isJavaScriptEnabled?: boolean;

    /**
     Inject a function to be executed prior to navigation.

     This can be useful for [altering the JavaScript environment](https://github.com/puppeteer/puppeteer/blob/main/docs/api.md#pageevaluateonnewdocumentpagefunction-args). For example, you could define a global method on the `window`, overwrite `navigator.languages` to change the language presented by the browser, or mock `Math.random` to return a fixed value.
     */
    readonly preloadFunction?: EvaluateFn;

    /**
     Inject [JavaScript modules](https://developers.google.com/web/fundamentals/primers/modules) into the page.

     Accepts an array of inline code, absolute URLs, and local file paths (must have a .js extension).

     @example
     ```
     import captureWebsite from 'capture-website';

     await captureWebsite.file('https://sindresorhus.com', 'screenshot.png', {
		modules: [
			'https://sindresorhus.com/remote-file.js',
			'local-file.js',
			`
			document.body.style.backgroundColor = 'red';
			`
		]
	});
     ```
     */
    readonly modules?: string[];

    /**
     Same as the `modules` option, but instead injects the code as [`<script>` instead of `<script type="module">`](https://developers.google.com/web/fundamentals/primers/modules). Prefer the `modules` option whenever possible.
     */
    readonly scripts?: string[];

    /**
     Inject CSS styles into the page.

     Accepts an array of inline code, absolute URLs, and local file paths (must have a `.css` extension).

     @example
     ```
     import captureWebsite from 'capture-website';

     await captureWebsite.file('https://sindresorhus.com', 'screenshot.png', {
		styles: [
			'https://sindresorhus.com/remote-file.css',
			'local-file.css',
			`
			body {
				background-color: red;
			}
			`
		]
	});
     ```
     */
    readonly styles?: string[];

    /**
     Set custom [HTTP headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers).

     @default {}

     @example
     ```
     import captureWebsite from 'capture-website';

     await captureWebsite.file('https://sindresorhus.com', 'screenshot.png', {
		headers: {
			'x-powered-by': 'https://github.com/sindresorhus/capture-website'
		}
	});
     ```
     */
    readonly headers?: Record<string, string>;

    /**
     Set a custom [user agent](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/User-Agent).
     */
    readonly userAgent?: string;

    /**
     Set cookies in [browser string format](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies) or [object format](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagesetcookiecookies).

     Tip: Go to the website you want a cookie for and [copy-paste it from DevTools](https://stackoverflow.com/a/24961735/64949).

     @example
     ```
     import captureWebsite from 'capture-website';

     await captureWebsite.file('https://sindresorhus.com', 'screenshot.png', {
		cookies: [
			// This format is useful for when you copy it from the browser
			'id=unicorn; Expires=Wed, 21 Oct 2018 07:28:00 GMT;',

			// This format is useful for when you have to manually create a cookie
			{
				name: 'id',
				value: 'unicorn',
				expires: Math.round(new Date('2018-10-21').getTime() / 1000)
			}
		]
	});
     ```
     */
    readonly cookies?: Array<string | Protocol.Network.CookieParam>;

    /**
     Credentials for [HTTP authentication](https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication).
     */
    authentication?: Authentication;

    /**
     The specified function is called right before the screenshot is captured, as well as before any bounding rectangle is calculated as part of `options.element`. It receives the Puppeteer [`Page` instance](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-page) as the first argument and the [`browser` instance](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#class-browser) as the second argument. This gives you a lot of power to do custom stuff. The function can be async.

     Note: Make sure to not call `page.close()` or `browser.close()`.

     @example
     ```
     import captureWebsite from 'capture-website';
     import checkSomething from './check-something.js';

     await captureWebsite.file('https://sindresorhus.com', 'screenshot.png', {
		beforeScreenshot: async (page, browser) => {
			await checkSomething();
			await page.click('#activate-button');
			await page.waitForSelector('.finished');
		}
	});
     ```
     */
    readonly beforeScreenshot?: BeforeScreenshot;

    /**
     Show the browser window so you can see what it's doing, redirect page console output to the terminal, and slow down each Puppeteer operation.

     Note: This overrides `launchOptions` with `{headless: false, slowMo: 100}`.

     @default false
     */
    readonly debug?: boolean;

    /**
     Emulate preference of dark color scheme ([`prefers-color-scheme`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)).

     @default false
     */
    readonly darkMode?: boolean;

    /**
     Options passed to [`puppeteer.launch()`](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#puppeteerlaunchoptions).

     Note: Some of the launch options are overridden by the `debug` option.

     @default {}
     */
    readonly launchOptions?: LaunchOptions & BrowserLaunchArgumentOptions & BrowserConnectOptions & {
        product?: Product;
        extraPrefsFirefox?: Record<string, unknown>;
    };

    /**
     Inset the bounding box of the screenshot.

     @default 0

     Accepts an object `{top?: number; right?: number; bottom?: number; left?: number}` or a `number` as a shorthand for all directions.

     Positive values, for example `inset: 10`, will decrease the size of the screenshot.
     Negative values, for example `inset: {left: -10}`, will increase the size of the screenshot.

     Note: This option is ignored if the `fullPage` option is set to `true`. Can be combined with the `element` option.
     Note: When the `width` or `height` of the screenshot is equal to `0` an error is thrown.

     Example: Include 10 pixels around the element.

     @example
     ```
     await captureWebsite.file('index.html', 'screenshot.png', {
		element: '.logo',
		inset: -10
	});
     ```

     Example: Ignore 15 pixels from the top of the viewport.

     @example
     ```
     await captureWebsite.file('index.html', 'screenshot.png', {
		inset: {
			top: 15
		}
	});
     ```
     */
    readonly inset?: number | Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>;

    clip?: Clip;

    omitBackground?: boolean;
}

export interface FileOptions extends Options {

    /**
     Overwrite the destination file if it exists instead of throwing an error.

     @default false
     */
    readonly overwrite?: boolean;
}


const isUrl = string => /^(https?|file):\/\/|^data:/.test(string);

const scrollToElement = (element, options) => {
    const isOverflown = element => {
        return (
            element.scrollHeight > element.clientHeight ||
            element.scrollWidth > element.clientWidth
        );
    };

    const findScrollParent = element => {
        if (element === undefined) {
            return;
        }

        if (isOverflown(element)) {
            return element;
        }

        return findScrollParent(element.parentElement);
    };

    const calculateOffset = (rect, options) => {
        if (options === undefined) {
            return {
                x: rect.left,
                y: rect.top
            };
        }

        const offset = options.offset || 0;

        switch (options.offsetFrom) {
            case 'top':
                return {
                    x: rect.left,
                    y: rect.top + offset
                };
            case 'right':
                return {
                    x: rect.left - offset,
                    y: rect.top
                };
            case 'bottom':
                return {
                    x: rect.left,
                    y: rect.top - offset
                };
            case 'left':
                return {
                    x: rect.left + offset,
                    y: rect.top
                };
            default:
                throw new Error('Invalid `scrollToElement.offsetFrom` value');
        }
    };

    const rect = element.getBoundingClientRect();
    const offset = calculateOffset(rect, options);
    const parent = findScrollParent(element);

    if (parent !== undefined) {
        parent.scrollIntoView(true);
        parent.scrollTo(offset.x, offset.y);
    }
};

const disableAnimations = () => {
    const rule = `
		*,
		::before,
		::after {
			animation: initial !important;
			transition: initial !important;
		}
	`;

    const style = document.createElement('style');
    document.body.append(style);

    if (style && style.sheet) {
        style.sheet.insertRule(rule);
    }
};

const getBoundingClientRect = element => {
    const {top, left, height, width, x, y} = element.getBoundingClientRect();
    return {top, left, height, width, x, y};
};

const parseCookie = (url, cookie) => {
    if (typeof cookie === 'object') {
        return cookie;
    }

    const jar = new toughCookie.CookieJar(undefined, {rejectPublicSuffixes: false});
    jar.setCookieSync(cookie, url);
    const returnValue = jar.serializeSync().cookies[0];

    // Use this instead of the above when the following issue is fixed:
    // https://github.com/salesforce/tough-cookie/issues/149
    // const ret = toughCookie.parse(cookie).serializeSync();

    returnValue.name = returnValue.key;
    delete returnValue.key;

    if (returnValue.expires) {
        returnValue.expires = Math.floor(new Date(returnValue.expires).getTime() / 1000);
    }

    return returnValue;
};

const imagesHaveLoaded = () => Object.values(document.images).map(element => element.complete);

const internalCaptureWebsite = async (input, options) => {
    options = {
        inputType: 'url',
        width: 1280,
        height: 800,
        scaleFactor: 2,
        fullPage: false,
        defaultBackground: true,
        timeout: 60, // The Puppeteer default of 30 is too short
        delay: 0,
        debug: false,
        darkMode: false,
        launchOptions: {},
        _keepAlive: false,
        isJavaScriptEnabled: true,
        inset: 0,
        ...options
    };

    const isHTMLContent = options.inputType === 'html';

    input = isHTMLContent || isUrl(input) ? input : fileUrl(input);

    const timeoutInSeconds = options.timeout * 1000;

    const viewportOptions = {
        width: options.width,
        height: options.height,
        deviceScaleFactor: options.scaleFactor
    };

    const screenshotOptions: FileOptions = {};

    if (options.type) {
        screenshotOptions.type = options.type;
    }

    if (options.quality) {
        screenshotOptions.quality = options.quality * 100;
    }

    if (options.fullPage) {
        screenshotOptions.fullPage = options.fullPage;
    }

    if (typeof options.defaultBackground === 'boolean') {
        screenshotOptions.omitBackground = !options.defaultBackground;
    }

    const launchOptions = {...options.launchOptions};

    if (options.debug) {
        launchOptions.headless = false;
        launchOptions.slowMo = 100;
    }

    const browser = options._browser || await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    if (options.preloadFunction) {
        await page.evaluateOnNewDocument(options.preloadFunction);
    }

    await page.setJavaScriptEnabled(options.isJavaScriptEnabled);

    if (options.debug) {
        page.on('console', message => {
            let {url, lineNumber, columnNumber} = message.location();
            lineNumber = lineNumber ? `:${lineNumber}` : '';
            columnNumber = columnNumber ? `:${columnNumber}` : '';
            const location = url ? ` (${url}${lineNumber}${columnNumber})` : '';
            console.log(`\nPage log:${location}\n${message.text()}\n`);
        });

        page.on('pageerror', error => {
            console.log('\nPage error:', error, '\n');
        });

        // TODO: Add more events from https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#event-requestfailed
    }

    if (options.authentication) {
        await page.authenticate(options.authentication);
    }

    if (options.cookies) {
        const cookies = options.cookies.map(cookie => parseCookie(isHTMLContent ? 'about:blank' : input, cookie));
        await page.setCookie(...cookies);
    }

    if (options.headers) {
        await page.setExtraHTTPHeaders(options.headers);
    }

    if (options.userAgent) {
        await page.setUserAgent(options.userAgent);
    }

    await page.setViewport(viewportOptions);

    if (options.emulateDevice) {
        if (!(options.emulateDevice in puppeteer.devices)) {
            throw new Error(`The device name \`${options.emulateDevice}\` is not supported`);
        }

        await page.emulate(puppeteer.devices[options.emulateDevice]);
    }

    await page.emulateMediaFeatures([{
        name: 'prefers-color-scheme',
        value: options.darkMode ? 'dark' : 'light'
    }]);

    await page[isHTMLContent ? 'setContent' : 'goto'](input, {
        timeout: timeoutInSeconds,
        waitUntil: 'networkidle2',
    });

    if (options.disableAnimations) {
        await page.evaluate(disableAnimations, options.disableAnimations);
    }

    if (Array.isArray(options.hideElements) && options.hideElements.length > 0) {
        await page.addStyleTag({
            content: `${options.hideElements.join(', ')} { visibility: hidden !important; }`
        });
    }

    if (Array.isArray(options.removeElements) && options.removeElements.length > 0) {
        await page.addStyleTag({
            content: `${options.removeElements.join(', ')} { display: none !important; }`
        });
    }

    if (options.clickElement) {
        await page.click(options.clickElement);
    }

    const getInjectKey = (ext, value) => isUrl(value) ? 'url' : (value.endsWith(`.${ext}`) ? 'path' : 'content');

    if (!options.isJavaScriptEnabled) {
        // Enable JavaScript again for `modules` and `scripts`.
        await page.setJavaScriptEnabled(true);
    }

    if (options.modules) {
        await Promise.all(options.modules.map(module_ => {
            return page.addScriptTag({
                [getInjectKey('js', module_)]: module_,
                type: 'module'
            });
        }));
    }

    if (options.scripts) {
        await Promise.all(options.scripts.map(script => {
            return page.addScriptTag({
                [getInjectKey('js', script)]: script
            });
        }));
    }

    if (options.styles) {
        await Promise.all(options.styles.map(style => {
            return page.addStyleTag({
                [getInjectKey('css', style)]: style
            });
        }));
    }

    if (options.waitForElement) {
        await page.waitForSelector(options.waitForElement, {
            visible: true,
            timeout: timeoutInSeconds
        });
    }

    if (options.beforeScreenshot) {
        await options.beforeScreenshot(page, browser);
    }

    if (options.element) {
        await page.waitForSelector(options.element, {
            visible: true,
            timeout: timeoutInSeconds
        });
        screenshotOptions.clip = await page.$eval(options.element, getBoundingClientRect);
        screenshotOptions.fullPage = false;
    }

    if (options.delay) {
        await page.waitForTimeout(options.delay * 1000);
    }

    if (options.scrollToElement) {
        if (typeof options.scrollToElement === 'object') {
            await page.$eval(options.scrollToElement.element, scrollToElement, options.scrollToElement);
        } else {
            await page.$eval(options.scrollToElement, scrollToElement);
        }
    }

    if (screenshotOptions.fullPage) {
        // Get the height of the rendered page
        const bodyHandle = await page.$('body');
        const bodyBoundingHeight = await bodyHandle.boundingBox();
        await bodyHandle.dispose();

        // Scroll one viewport at a time, pausing to let content load
        const viewportHeight = viewportOptions.height;
        let viewportIncrement = 0;
        while (viewportIncrement + viewportHeight < bodyBoundingHeight) {
            const navigationPromise = page.waitForNavigation({waitUntil: 'networkidle0'});
            await page.evaluate(_viewportHeight => {
                window.scrollBy(0, _viewportHeight);
            }, viewportHeight);
            await navigationPromise;
            viewportIncrement += viewportHeight;
        }

        // Scroll back to top
        await page.evaluate(_ => {
            window.scrollTo(0, 0);
        });

        // Some extra delay to let images load
        await page.waitForFunction(imagesHaveLoaded, {timeout: timeoutInSeconds});
    }

    if (options.inset && !screenshotOptions.fullPage) {
        const inset = {top: 0, right: 0, bottom: 0, left: 0};
        for (const key of Object.keys(inset)) {
            if (typeof options.inset === 'number') {
                inset[key] = options.inset;
            } else {
                inset[key] = options.inset[key] || 0;
            }
        }

        let clipOptions = screenshotOptions.clip;

        if (!clipOptions) {
            clipOptions = await page.evaluate(() => ({
                x: 0,
                y: 0,
                height: window.innerHeight,
                width: window.innerWidth
            }));
        } else {
            const x = clipOptions.x + inset.left;
            const y = clipOptions.y + inset.top;
            const width = clipOptions.width - (inset.left + inset.right);
            const height = clipOptions.height - (inset.top + inset.bottom);

            clipOptions = {x, y, width, height}
        }

        if (clipOptions?.width === 0 || clipOptions?.height === 0) {
            await page.close();

            throw new Error('When using the `clip` option, the width or height of the screenshot cannot be equal to 0.');
        }

        screenshotOptions.clip = clipOptions;
    }

    const buffer = await page.screenshot(screenshotOptions);

    await page.close();

    if (!options._keepAlive) {
        await browser.close();
    }

    return buffer;
};

export const captureWebsite = {
    /**
     Capture a screenshot of the given `input` and save it to the given `outputFilePath`.
     @param url
     @param outputFilePath - The path to write the screenshot.
     @param options
     @returns A promise that resolves when the screenshot is written to the given file path.

     @example
     ```
     import captureWebsite from 'capture-website';

     await captureWebsite.file('https://sindresorhus.com', 'screenshot-url.png');

     await captureWebsite.file('<h1>Awesome!</h1>', 'screenshot-html.png', {
		inputType: 'html'
	});
     ```
     */
    file: async (url: string, outputFilePath: string, options?: FileOptions): Promise<void> => {
        const screenshot = await internalCaptureWebsite(url, options);

        await fs.writeFile(outputFilePath, screenshot, {
            flag: options?.overwrite ? 'w' : 'wx'
        });
    },
    /**
     Capture a screenshot of the given `input`.

     @returns The screenshot as binary.
     * @param url
     * @param options
     */
    buffer: async (url: string, options?: Options): Promise<Buffer> => internalCaptureWebsite(url, options),
    /**
     Capture a screenshot of the given `input`.

     @returns The screenshot as [Base64](https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding).
     * @param url
     * @param options
     */
    base64: async (url: string, options?: Options): Promise<string> => {
        const screenshot = await internalCaptureWebsite(url, options);
        return screenshot.toString('base64');
    }
};

/**
 Devices supported by the `emulateDevice` option.
 */
export const devices: string[] = Object.values(puppeteer.devices).map(device => device.name);

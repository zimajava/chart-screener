"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const sleep = require("sleep-promise");
class BrowserProxy {
    constructor(browsers) {
        this._browsers = browsers;
    }
    newPage() {
        return __awaiter(this, void 0, void 0, function* () {
            const { browser, pages } = yield this._getFreestBrowser();
            if (pages.length <= 1) {
                return browser.newPage();
            }
            else { // browser already rendering a page
                if (pages.length > 2) {
                    // this should never happen
                    throw new Error(`Too many pages open, possible memory leak - # of pages:${pages.length}`);
                }
                yield sleep(50);
                return this.newPage();
            }
        });
    }
    goto(page, url, viewport, headers, waitUntil) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!page)
                throw new Error('Couldn\'t create new page');
            yield page.setViewport(viewport);
            yield page.setExtraHTTPHeaders(headers);
            yield page.goto(url, { waitUntil });
        });
    }
    screenshot(headers, url, options, viewport, waitUntil, retry = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            let page = undefined;
            try {
                page = yield this.newPage();
                if (!options.clip)
                    options = { fullPage: true };
                yield this.goto(page, url, viewport, headers, waitUntil);
                return yield page.screenshot(options);
            }
            catch (e) {
                if (page)
                    yield page.close();
                if (retry < 2)
                    return this.screenshot(headers, url, options, viewport, waitUntil, retry + 1);
                else
                    throw new Error(`3 Retries failed - stacktrace: \n\n${e.stack}`);
            }
            finally {
                if (page)
                    yield page.close();
            }
        });
    }
    pdf(headers, url, viewport, options, waitUntil, retry = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            let page = undefined;
            try {
                page = yield this.newPage();
                yield this.goto(page, url, viewport, headers, waitUntil);
                return yield page.pdf(options);
            }
            catch (e) {
                if (retry < 2) {
                    return this.pdf(headers, url, viewport, options, waitUntil, retry + 1);
                }
                else {
                    throw new Error(`3 Retries failed - stacktrace: \n\n${e.stack}`);
                }
            }
            finally {
                if (page) {
                    yield page.close();
                }
            }
        });
    }
    _getFreestBrowser() {
        return __awaiter(this, void 0, void 0, function* () {
            const browsers = yield Promise.all(this._browsers);
            const freestBrowser = yield browsers.reduce((prevBrowser, browser) => __awaiter(this, void 0, void 0, function* () {
                const prev = yield prevBrowser;
                const pages = yield browser.pages();
                // if prev is the empty object
                return Object.keys(prev).length === 0 || pages.length < prev.pages.length
                    ? { pages, browser }
                    : prev;
            }), Promise.resolve({}));
            return freestBrowser;
        });
    }
}
exports.default = BrowserProxy;

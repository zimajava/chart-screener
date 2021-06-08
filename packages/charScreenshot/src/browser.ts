
import { Browser, Page, ScreenshotOptions, Viewport, PDFOptions } from 'puppeteer'
import sleep from 'sleep-promise'

export default class BrowserProxy {
    readonly _browsers: Promise<Browser>[]

    constructor(browsers: Promise<Browser>[]) {
        this._browsers = browsers
    }

    async newPage(): Promise<Page> {
        const { browser, pages } = await this._getFreestBrowser()
        if (pages.length <= 1) {
            return browser.newPage()
        } else { // browser already rendering a page
            if (pages.length > 2) {
                // this should never happen
                throw new Error(`Too many pages open, possible memory leak - # of pages:${pages.length}`)
            }
            await sleep(50)
            return this.newPage()
        }
    }

    async goto(page: Page, url: string, viewport: Viewport, headers: Record<string, string>, waitUntil): Promise<void> {
        if (!page)
            throw new Error('Couldn\'t create new page')

        await page.setViewport(viewport)
        await page.setExtraHTTPHeaders(headers)
        await page.goto(url, { waitUntil })
    }

    async screenshot(headers: Record<string, string>, url: string, options, viewport, waitUntil, retry = 0): Promise<Buffer | string | void> {
        let page: Page | undefined = undefined
        try {
            page = await this.newPage()
            if (!options.clip)
                options = { fullPage: true }

            await this.goto(page, url, viewport, headers, waitUntil)

            return await page.screenshot(options)
        } catch (e) {
            if (page)
                await (page as Page).close()

            if (retry < 2)
                return this.screenshot(headers, url, options, viewport, waitUntil, retry + 1)
            else
                throw new Error(`3 Retries failed - stacktrace: \n\n${e.stack}`)
        } finally {
            if (page)
                await (page as Page).close()
        }
    }

    async pdf(headers: Record<string, string>, url: string, viewport: Viewport, options: PDFOptions, waitUntil, retry = 0): Promise<Buffer> {
        let page: Page | undefined = undefined
        try {
            page = await this.newPage()

            await this.goto(page, url, viewport, headers, waitUntil)

            return await page.pdf(options)
        } catch (e) {
            if (retry < 2) {
                return this.pdf(headers, url, viewport, options, waitUntil, retry + 1)
            } else {
                throw new Error(`3 Retries failed - stacktrace: \n\n${e.stack}`)
            }
        } finally {
            if (page){
                await (page as Page).close()
            }
        }
    }

    async _getFreestBrowser(): Promise<{ browser: Browser, pages: Page[] }> {
        const browsers = await Promise.all<Browser>(this._browsers)

        const freestBrowser = await browsers.reduce(async (prevBrowser, browser) => {
            const prev = await prevBrowser
            const pages = await browser.pages()

            // if prev is the empty object
            return Object.keys(prev).length === 0 || pages.length < prev.pages.length
                ? { pages, browser }
                : prev

        }, Promise.resolve({}) as Promise<{ browser: Browser, pages: Page[] }>)
        return freestBrowser
    }
}

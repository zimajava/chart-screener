import * as express from 'express'
import { Request, Response } from 'express';
// import * as RateLimit from 'express-rate-limit'
import * as puppeteer from 'puppeteer'
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

import Browser from './browser'
import {getPropertiesFromImg, isValidUrl, Query, transformHeaders} from './requestHelper'

// const NUM_BROWSERS = parseInt(process.argv[2], 10) || 10

// if (!NUM_BROWSERS) {
//     throw new Error('Need to specify a non zero NUM_BROWSERS')
// }

/*
 * IMPORTANT - each browser is listening to process's "exit" event
 * this line allows more than the default 10 listeners / browsers open at a time
 */
// process.setMaxListeners(NUM_BROWSERS)

// const browserOptions = {
//     args: [
//         '--no-sandbox',
//         '--disable-setuid-sandbox'
//     ]
// }

// const browser = new Browser([...Array(NUM_BROWSERS)].map(_ => puppeteer.launch(browserOptions)))

const app  = express()
const port = process.env.PORT || 3050;

// const limiter = new RateLimit({
//     windowMs: 2 * 1000, // 2 seconds
//     max: NUM_BROWSERS, // limit to `NUM_BROWSER` requests per windowMs
//     delayAfter: NUM_BROWSERS * 2,
//     delayMs: 0 // disable delaying - full speed until the max limit is reached
// })

// app.use(limiter)

app.get('/png', async (req: Request, res: Response) => {
    // if (!req.query.url || !isValidUrl(req.query.url as string)) {
    //     res.status(422).send('need a valid url')
    //     return
    // }

    // const url = decodeURIComponent(req.query.url as string)

    // const [ viewport, options, waitUntil ] = getPropertiesFromImg(<Query>req.query)

    // const headers = transformHeaders(req.rawHeaders)

    const setDomainLocalStorage = async (browser, url, localStorageValues, cookiesValues) => {
        const page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', r => r.respond({status: 200, contentType: 'text/plain', body: 'tweak me.',}));
        await page.goto(url);
        await page.evaluate(values => {
            for (const key in values) {
                window.localStorage.setItem(key, values[key]);
            }
        }, localStorageValues);
        await page.setCookie(...cookiesValues)
        await page.close();
    };

    const getScreenshot = async (url, localStorageValues, cookiesValues) => {
        const browser = await puppeteer.launch({
            headless: true,
            // defaultViewport: {width: 1920, height: 1080},
            waitForInitialPage: true,
            devtools: false
        });

        await setDomainLocalStorage(browser, url, localStorageValues, cookiesValues);

        const page = await browser.newPage();
        await page.goto(url, {waitUntil: 'networkidle0'});
        try {
            return await page.screenshot({ type: 'png', clip: {x: 367, y: 107, width: 717.1875, height: 334.34375}});
        } catch (e) {
            console.error(e)
        } finally {
            await page.close();
            await browser.close();
        }
    };

    const isProd = true
    const email = isProd ? "alexander.ivanov.0405@gmail.com" : "devtest@i.ua"
    const pass = isProd ? "123qwe" : "Dev123123"
    const tid = new Date().getTime()
    const body = {"user": email, "pwd": pass, "needpack": true, "clienttype": "webLightDesktop", "rabbitOff": true}
    const url = `https://${isProd ? '' : 'dev-'}light-trading.umarkets.ai`
    const auth = `${url}/auth/`
    const main = `${url}/index.html?tid=${tid}`

    const {data, headers} = await axios.post(auth, body)
    // console.log(data, headers)
    const setCookie = headers['set-cookie']
    const unSession = setCookie[0]?.split(';')[0]?.split('=')[1] || ''
    const sid = data ? data.sid : ''
    const su = data ? data.stompUser : ''
    const sp = data ? data.stompPassword : ''
    // console.log(sid, su, sp, unSession)
    const cookies = setCookie.map((cookie) => {
        const temp = {"name": "", "value": "", "domain": ".umarkets.ai", "path": "/", "httpOnly": false, "secure": false, "session": false, "sameParty": false,}
        const cookieFields = cookie.split(';')
        cookieFields.forEach((field, idx) => {
            if (idx === 0) {
                const [key, value] = field.split('=')
                temp.name = key
                temp.value = value
            }
        })
        return temp
    })
    const platformParamValue = `{"sid": "${sid}", "su": "${su}", "sp": "${sp}", "tid": "${tid}", "th": "light", "lang": "en", "uid": "${email}", "isConnectAlive": true, "umSession": "${unSession}"}`
    const cookiesValues = [
        {
            "name": "platformParams",
            "value": platformParamValue,
            "domain": ".umarkets.ai",
            "path": "/",
            "httpOnly": false,
            "secure": false,
            "session": false,
            "sameParty": false,
        },
        {
            "name": "selectedPlatformVersion",
            "value": 'new',
            "domain": ".umarkets.ai",
            "path": "/",
            "httpOnly": false,
            "secure": false,
            "session": false,
            "sameParty": false,
        },
        ...cookies
    ]

    const localStorageJSON = `{
        "isShowHeader": true,
        "isShowUserMenu": true,
        "blocksActive": {
            "charts": true,
            "instruments": true,
            "deals": true,
            "type": true
        },
        "currentTheme": "lightTheme",
        "timeWidgetData": {
            "isOpen": false,
            "city": "",
            "position": null
        },
        "videoWidgetData": {
            "size": {
                "width": 0,
                "height": 0
            },
            "position": null
        },
        "calculatorWidgetData": {
            "size": {
                "width": 0,
                "height": 0
            },
            "isOpen": false,
            "isBigWidget": true,
            "bigWidgetPosition": null,
            "smallWidgetPosition": null
        },
        "economicalCalendarSettings": {
            "filter": "",
            "calendar": ""
        },
        "prevSuccessCrmClientSettings": {
            "isEnablePersonalNotification": true,
            "economicalCalendar": "level1",
            "technicalAnalysis": "level1",
            "isEnableSwitchPlatform": false,
            "autochartist": "level0",
            "isEnableLayoutSelect": false,
            "countOfCheck": 0,
            "isInitialState": false
        },
        "settings": {
            "oneClickTrading": false,
            "tradingUnit": "amount",
            "isDesktopNotificationEnable": false
        },
        "chart": {
            "isPipsShow": true,
            "isFullScreen": false,
            "chartSettings": {
                "version": "1.1",
                "isSidebarHidden": true,
                "isHeaderHidden": true,
                "isFullScreen": false,
                "isDataPanel": true,
                "lang": "en",
                "activeSpliter": 0,
                "activeChartIndex": 0,
                "params": {
                    "version": "1.1",
                    "pair": {
                        "ID": 4,
                        "Name": "EURUSD",
                        "FullName": "EUR/USD",
                        "Category": "Currency"
                    },
                    "period": "60",
                    "timeMode": "local",
                    "chartType": "candle",
                    "state": "default",
                    "indicators": [],
                    "currentValue": {
                        "ask": "0.00000",
                        "bid": "0.00000",
                        "mid": "0.00000"
                    },
                    "quotationCountries": false,
                    "lang": "en",
                    "defaultLang": "en",
                    "isHeaderHidden": false,
                    "isSidebarHidden": false,
                    "isFullScreen": false,
                    "isDataPanel": true,
                    "isAutoRestore": true,
                    "isMagnetMode": false,
                    "isStayDrawingMode": false,
                    "isShowDrawingObjects": true,
                    "isDataPanelBodyOpened": false,
                    "isDrawingObjectsLocked": false,
                    "isShowChartContextMenu": false,
                    "isInstanceWithOffset": true,
                    "isMinMaxPricesMarksEnabled": false,
                    "isPipsShow": false,
                    "rowsid": [],
                    "defaultId": "4",
                    "typeThemes": "darkthema",
                    "listTemesDesign": [
                        "darkthema",
                        "whitethema"
                    ],
                    "isConfigpage": false,
                    "typeData": "bid",
                    "signalTypesData": [
                        "mid"
                    ],
                    "tabsQuantity": 10,
                    "timeframesForEvents": [
                        "minute",
                        "minute5",
                        "minute15",
                        "minute30",
                        "hour"
                    ],
                    "timeframesForNews": [
                        "minute",
                        "minute5",
                        "minute15",
                        "minute30",
                        "hour"
                    ],
                    "offsetChart": 0.2,
                    "defaultParams": {
                        "activeSpliter": 0,
                        "activeChartIndex": 0,
                        "cursorType": "arrow",
                        "setTimeoutforSave": 750,
                        "paramsPanels": {
                            "isHeaderHidden": true,
                            "isSidebarHidden": true,
                            "isFullScreen": false,
                            "isDataPanel": true
                        }
                    },
                    "modules": {
                        "isSideBarCreate": true,
                        "isHeaderCreate": true,
                        "headerButtons": {
                            "searchQuotationButton": false,
                            "createTabButton": true,
                            "fullScreenButton": false,
                            "chartTypeButton": false,
                            "periodsButton": false,
                            "indicatorButton": false,
                            "splitterButton": false,
                            "createTypeDataButton": false,
                            "settingsButton": false,
                            "createPipsButton": true,
                            "screenshotButton": false,
                            "typeDataButton": false,
                            "htmlTypeDataButton": false,
                            "createFavouritesButton": false
                        },
                        "sideBarButtons": {
                            "cursorTypeButton": true,
                            "drawingObjectsButton": true,
                            "brushTypeButton": true,
                            "zoomButton": true,
                            "lockButton": true,
                            "basketButton": true,
                            "saveRestoreButtons": true,
                            "stayDrawingModeButton": true,
                            "hideDrowingObjectButton": true,
                            "magnetModeButton": true,
                            "rouleteButton": true,
                            "textTypeButton": true
                        },
                        "chartElements": {
                            "hiddenDataPanel": true,
                            "isDataPanelCreate": true,
                            "isShowPriceLineOfLastBar": true
                        },
                        "isShowNews": false,
                        "isShowEvents": false,
                        "signals": true,
                        "isSignalAutoFit": true,
                        "trading": false,
                        "slTpLines": true,
                        "pnlPrediction": true
                    },
                    "dropDown": {
                        "periods": [
                            "minute",
                            "minute5",
                            "minute15",
                            "minute30",
                            "hour",
                            "hour4",
                            "hour8",
                            "day",
                            "week",
                            "month"
                        ],
                        "chartTypes": [
                            "candle",
                            "area",
                            "line",
                            "bar",
                            "hollow",
                            "heikin"
                        ],
                        "typeDatas": [
                            "bid",
                            "ask",
                            "mid"
                        ],
                        "indicators": [
                            "Bears",
                            "Bulls",
                            "SO",
                            "ATR",
                            "RSI",
                            "WILLIAMSR",
                            "ADX",
                            "MACD",
                            "SMA",
                            "EMA",
                            "BB",
                            "Fractal",
                            "Ichimoku",
                            "Env",
                            "DEMA",
                            "Sar",
                            "STD",
                            "Keltner",
                            "Donchian",
                            "AO",
                            "AC",
                            "LRI",
                            "StochRsi"
                        ]
                    },
                    "footer": {
                        "isFooterCreate": false,
                        "periods": [
                            "minute",
                            "hour",
                            "day",
                            "week",
                            "month"
                        ]
                    },
                    "quotationName": " ",
                    "images": {},
                    "rightPadding": 8,
                    "candleWidth": 6,
                    "dataOffset": 0,
                    "precission": 5,
                    "marginTop": 50,
                    "marginBottom": 20,
                    "scaleParams": {},
                    "numb": 500,
                    "fallBack": 500,
                    "zoomView": 1,
                    "drawingObjects": [],
                    "startY": 0,
                    "defaultTopPositionDataWindowOnChart": 46
                },
                "settings": {
                    "quotations": [
                        {
                            "ID": 62,
                            "Name": "AMZN",
                            "FullName": "AMAZON",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 0,
                            "Name": "AAPL",
                            "FullName": "APPLE",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 208,
                            "Name": "SPIAUD",
                            "FullName": "ASX 200",
                            "Category": "Index",
                            "isPopular": false
                        },
                        {
                            "ID": 79,
                            "Name": "AUDCAD",
                            "FullName": "AUD/CAD",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 32,
                            "Name": "AUDCHF",
                            "FullName": "AUD/CHF",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 121,
                            "Name": "AUDJPY",
                            "FullName": "AUD/JPY",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 96,
                            "Name": "AUDNZD",
                            "FullName": "AUD/NZD",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 179,
                            "Name": "AUDUSD",
                            "FullName": "AUD/USD",
                            "Category": "Currency",
                            "isPopular": true
                        },
                        {
                            "ID": 9,
                            "Name": "ABBV",
                            "FullName": "AbbVie",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 17,
                            "Name": "ATVI",
                            "FullName": "Activision Blizzard",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 70,
                            "Name": "ADS",
                            "FullName": "Adidas",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 214,
                            "Name": "ADBE",
                            "FullName": "Adobe",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 141,
                            "Name": "AIR",
                            "FullName": "Airbus Group",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 81,
                            "Name": "AlJazirBank",
                            "FullName": "AlJazirBank",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 161,
                            "Name": "AlRajhiBank",
                            "FullName": "AlRajhiBank",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 72,
                            "Name": "BABA",
                            "FullName": "Alibaba",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 157,
                            "Name": "Alinma",
                            "FullName": "Alinma",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 191,
                            "Name": "ALV",
                            "FullName": "Allianz",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 123,
                            "Name": "XAIUSD",
                            "FullName": "Altcoin Index",
                            "Category": "CryptoCurrency",
                            "isPopular": false
                        },
                        {
                            "ID": 28,
                            "Name": "Alujain",
                            "FullName": "Alujain",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 200,
                            "Name": "AMS",
                            "FullName": "Amadeus",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 119,
                            "Name": "AXP",
                            "FullName": "American Express",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 107,
                            "Name": "AOBC",
                            "FullName": "American Outdoor",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 15,
                            "Name": "ArabBank",
                            "FullName": "ArabBank",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 43,
                            "Name": "ACB",
                            "FullName": "Aurora Cannabis",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 244,
                            "Name": "BAS",
                            "FullName": "BASF",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 93,
                            "Name": "BHP",
                            "FullName": "BHPBilliton",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 176,
                            "Name": "BMW",
                            "FullName": "BMW",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 189,
                            "Name": "BNP",
                            "FullName": "BNPParibas",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 21,
                            "Name": "BA",
                            "FullName": "BOEING",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 35,
                            "Name": "BYND",
                            "FullName": "BYND",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 61,
                            "Name": "BankSaFrans",
                            "FullName": "BankSaFrans",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 113,
                            "Name": "BankofChina",
                            "FullName": "BankofChina",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 78,
                            "Name": "BARC",
                            "FullName": "Barclays",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 124,
                            "Name": "BATUSD",
                            "FullName": "Basic Attention Token",
                            "Category": "CryptoCurrency",
                            "isPopular": false
                        },
                        {
                            "ID": 190,
                            "Name": "BAYN",
                            "FullName": "Bayer",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 50,
                            "Name": "BEI",
                            "FullName": "Beiersdorf",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 110,
                            "Name": "BBVA",
                            "FullName": "BilbaoXETRA",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 228,
                            "Name": "BNTX",
                            "FullName": "BioNTech SE",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 92,
                            "Name": "BTCUSD",
                            "FullName": "Bitcoin",
                            "Category": "CryptoCurrency",
                            "isPopular": false
                        },
                        {
                            "ID": 206,
                            "Name": "BCHUSD",
                            "FullName": "BitcoinCash",
                            "Category": "CryptoCurrency",
                            "isPopular": false
                        },
                        {
                            "ID": 233,
                            "Name": "BKNG",
                            "FullName": "Booking",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 136,
                            "Name": "UKOUSD",
                            "FullName": "Brent Crude Oil",
                            "Category": "Commodity",
                            "isPopular": false
                        },
                        {
                            "ID": 230,
                            "Name": "CACEUR",
                            "FullName": "CAC40",
                            "Category": "Index",
                            "isPopular": false
                        },
                        {
                            "ID": 131,
                            "Name": "CADCHF",
                            "FullName": "CAD/CHF",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 49,
                            "Name": "CADJPY",
                            "FullName": "CAD/JPY",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 236,
                            "Name": "CHFJPY",
                            "FullName": "CHF/JPY",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 173,
                            "Name": "KO",
                            "FullName": "COCACOLA",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 41,
                            "Name": "CGC",
                            "FullName": "Canopy Growth",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 29,
                            "Name": "CVX",
                            "FullName": "Chevron",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 27,
                            "Name": "C",
                            "FullName": "Citigroup",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 53,
                            "Name": "ChinaRail",
                            "FullName": "CninaRail",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 171,
                            "Name": "CON",
                            "FullName": "Continental",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 36,
                            "Name": "DASHUSD",
                            "FullName": "DASH",
                            "Category": "CryptoCurrency",
                            "isPopular": false
                        },
                        {
                            "ID": 187,
                            "Name": "DAXEUR",
                            "FullName": "DAX",
                            "Category": "Index",
                            "isPopular": false
                        },
                        {
                            "ID": 12,
                            "Name": "DOWUSD",
                            "FullName": "DJ",
                            "Category": "Index",
                            "isPopular": false
                        },
                        {
                            "ID": 178,
                            "Name": "DAI",
                            "FullName": "Daimler",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 164,
                            "Name": "DarAlArkan",
                            "FullName": "DarAlArkan",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 52,
                            "Name": "DEFIXUSD",
                            "FullName": "DeFi Coin Index",
                            "Category": "CryptoCurrency",
                            "isPopular": false
                        },
                        {
                            "ID": 144,
                            "Name": "DCRUSD",
                            "FullName": "Decred",
                            "Category": "CryptoCurrency",
                            "isPopular": false
                        },
                        {
                            "ID": 181,
                            "Name": "DB1",
                            "FullName": "Deutsche Boerse",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 30,
                            "Name": "LHA",
                            "FullName": "Deutsche Lufthansa",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 158,
                            "Name": "DPW",
                            "FullName": "Deutsche Post",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 212,
                            "Name": "DTE",
                            "FullName": "Deutsche Telekom",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 63,
                            "Name": "DB",
                            "FullName": "DeutscheBank",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 68,
                            "Name": "ITX",
                            "FullName": "Diseno",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 58,
                            "Name": "EOAN",
                            "FullName": "E.ON",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 213,
                            "Name": "EBAY",
                            "FullName": "EBAY",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 238,
                            "Name": "EOSUSD",
                            "FullName": "EOS",
                            "Category": "CryptoCurrency",
                            "isPopular": false
                        },
                        {
                            "ID": 148,
                            "Name": "EURAUD",
                            "FullName": "EUR/AUD",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 38,
                            "Name": "EURCAD",
                            "FullName": "EUR/CAD",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 126,
                            "Name": "EURCHF",
                            "FullName": "EUR/CHF",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 152,
                            "Name": "EURCZK",
                            "FullName": "EUR/CZK",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 160,
                            "Name": "EURDKK",
                            "FullName": "EUR/DKK",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 170,
                            "Name": "EURGBP",
                            "FullName": "EUR/GBP",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 10,
                            "Name": "EURHKD",
                            "FullName": "EUR/HKD",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 174,
                            "Name": "EURHUF",
                            "FullName": "EUR/HUF",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 48,
                            "Name": "EURJPY",
                            "FullName": "EUR/JPY",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 211,
                            "Name": "EURMXN",
                            "FullName": "EUR/MXN",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 165,
                            "Name": "EURNOK",
                            "FullName": "EUR/NOK",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 188,
                            "Name": "EURNZD",
                            "FullName": "EUR/NZD",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 46,
                            "Name": "EURPLN",
                            "FullName": "EUR/PLN",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 243,
                            "Name": "EURRUB",
                            "FullName": "EUR/RUB",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 222,
                            "Name": "EURSEK",
                            "FullName": "EUR/SEK",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 134,
                            "Name": "EURSGD",
                            "FullName": "EUR/SGD",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 8,
                            "Name": "EURTRY",
                            "FullName": "EUR/TRY",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 4,
                            "Name": "EURUSD",
                            "FullName": "EUR/USD",
                            "Category": "Currency",
                            "isPopular": true
                        },
                        {
                            "ID": 215,
                            "Name": "EURZAR",
                            "FullName": "EUR/ZAR",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 86,
                            "Name": "E50EUR",
                            "FullName": "EUR50",
                            "Category": "Index",
                            "isPopular": false
                        },
                        {
                            "ID": 227,
                            "Name": "ETHUSD",
                            "FullName": "Ethereum",
                            "Category": "CryptoCurrency",
                            "isPopular": false
                        },
                        {
                            "ID": 128,
                            "Name": "ETCUSD",
                            "FullName": "Ethereum Classic",
                            "Category": "CryptoCurrency",
                            "isPopular": false
                        },
                        {
                            "ID": 16,
                            "Name": "XOM",
                            "FullName": "ExxonMobil",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 114,
                            "Name": "RACE",
                            "FullName": "FERRARI",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 155,
                            "Name": "FTSGBP",
                            "FullName": "FTSE",
                            "Category": "Index",
                            "isPopular": false
                        },
                        {
                            "ID": 82,
                            "Name": "FB",
                            "FullName": "Facebook",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 167,
                            "Name": "FDX",
                            "FullName": "FedEx",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 120,
                            "Name": "Ford",
                            "FullName": "Ford",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 42,
                            "Name": "FME",
                            "FullName": "Fresenius Medical Care",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 117,
                            "Name": "FRE",
                            "FullName": "Fresenius SE & Co",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 183,
                            "Name": "GBPAUD",
                            "FullName": "GBP/AUD",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 40,
                            "Name": "GBPCAD",
                            "FullName": "GBP/CAD",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 172,
                            "Name": "GBPCHF",
                            "FullName": "GBP/CHF",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 151,
                            "Name": "GBPDKK",
                            "FullName": "GBP/DKK",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 125,
                            "Name": "GBPHUF",
                            "FullName": "GBP/HUF",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 11,
                            "Name": "GBPJPY",
                            "FullName": "GBP/JPY",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 166,
                            "Name": "GBPNOK",
                            "FullName": "GBP/NOK",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 240,
                            "Name": "GBPNZD",
                            "FullName": "GBP/NZD",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 13,
                            "Name": "GBPPLN",
                            "FullName": "GBP/PLN",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 205,
                            "Name": "GBPSEK",
                            "FullName": "GBP/SEK",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 195,
                            "Name": "GBPSGD",
                            "FullName": "GBP/SGD",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 31,
                            "Name": "GBPTRY",
                            "FullName": "GBP/TRY",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 71,
                            "Name": "GBPUSD",
                            "FullName": "GBP/USD",
                            "Category": "Currency",
                            "isPopular": true
                        },
                        {
                            "ID": 246,
                            "Name": "GBPZAR",
                            "FullName": "GBP/ZAR",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 102,
                            "Name": "GOOG",
                            "FullName": "GOOGLE",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 90,
                            "Name": "GWPH",
                            "FullName": "GW Pharmaceuticals",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 210,
                            "Name": "GAZP",
                            "FullName": "Gazprom",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 122,
                            "Name": "SIBN",
                            "FullName": "GazpromNeft",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 101,
                            "Name": "GE",
                            "FullName": "GenElectric",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 247,
                            "Name": "GILD",
                            "FullName": "Gilead Sciences",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 99,
                            "Name": "GSK",
                            "FullName": "GlaxoSmithKline",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 88,
                            "Name": "GPRO",
                            "FullName": "GoPro",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 83,
                            "Name": "XAUUSD",
                            "FullName": "Gold (USD)",
                            "Category": "Commodity",
                            "isPopular": true
                        },
                        {
                            "ID": 105,
                            "Name": "GS",
                            "FullName": "GoldmanSach",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 229,
                            "Name": "HSIHKD",
                            "FullName": "HSI",
                            "Category": "Index",
                            "isPopular": false
                        },
                        {
                            "ID": 5,
                            "Name": "HOG",
                            "FullName": "HarleyDavidson",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 106,
                            "Name": "HEI",
                            "FullName": "Heidelbergcement",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 154,
                            "Name": "HEN3",
                            "FullName": "Henkel & Co",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 132,
                            "Name": "HNNA",
                            "FullName": "Hennessy",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 220,
                            "Name": "HLF",
                            "FullName": "Herbalife Nutrition",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 85,
                            "Name": "IBXEUR",
                            "FullName": "IBEX",
                            "Category": "Index",
                            "isPopular": false
                        },
                        {
                            "ID": 37,
                            "Name": "IBM",
                            "FullName": "IBM",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 156,
                            "Name": "ICBankChina",
                            "FullName": "ICBankChina",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 203,
                            "Name": "IOTUSD",
                            "FullName": "IOTA",
                            "Category": "CryptoCurrency",
                            "isPopular": false
                        },
                        {
                            "ID": 65,
                            "Name": "ITM",
                            "FullName": "ITM POWER",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 34,
                            "Name": "IBE",
                            "FullName": "Iberdrola",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 98,
                            "Name": "IFX",
                            "FullName": "Infineon Technologies",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 226,
                            "Name": "INO",
                            "FullName": "Inovio Pharmaceuticals",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 57,
                            "Name": "INTC",
                            "FullName": "Intel",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 223,
                            "Name": "JPM",
                            "FullName": "JPMorganCh",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 3,
                            "Name": "SDF",
                            "FullName": "K&S",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 111,
                            "Name": "Kingdom",
                            "FullName": "Kingdom",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 56,
                            "Name": "LIN",
                            "FullName": "Linde",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 199,
                            "Name": "LTCUSD",
                            "FullName": "Litecoin",
                            "Category": "CryptoCurrency",
                            "isPopular": false
                        },
                        {
                            "ID": 108,
                            "Name": "LMT",
                            "FullName": "Lockheed Martin",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 196,
                            "Name": "MC",
                            "FullName": "Louis Vuitton",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 216,
                            "Name": "LKOH",
                            "FullName": "Lukoil",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 147,
                            "Name": "LYFT",
                            "FullName": "Lyft",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 207,
                            "Name": "MED",
                            "FullName": "MEDIFAST INC",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 97,
                            "Name": "MSFT",
                            "FullName": "MICROSOFT",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 44,
                            "Name": "MUV2",
                            "FullName": "MRG",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 47,
                            "Name": "MTSS",
                            "FullName": "MTS",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 235,
                            "Name": "MKRUSD",
                            "FullName": "Maker DAO",
                            "Category": "CryptoCurrency",
                            "isPopular": false
                        },
                        {
                            "ID": 59,
                            "Name": "MANU",
                            "FullName": "ManchesterU",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 194,
                            "Name": "MA",
                            "FullName": "Mastercard",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 180,
                            "Name": "MCD",
                            "FullName": "McDonald's",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 19,
                            "Name": "MRNA",
                            "FullName": "Moderna",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 89,
                            "Name": "XMRUSD",
                            "FullName": "Monero",
                            "Category": "CryptoCurrency",
                            "isPopular": false
                        },
                        {
                            "ID": 242,
                            "Name": "MGI",
                            "FullName": "Moneygram",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 239,
                            "Name": "NEOUSD",
                            "FullName": "NEO",
                            "Category": "CryptoCurrency",
                            "isPopular": false
                        },
                        {
                            "ID": 7,
                            "Name": "NKE",
                            "FullName": "NIKE",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 186,
                            "Name": "NOKJPY",
                            "FullName": "NOK/JPY",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 45,
                            "Name": "NVDA",
                            "FullName": "NVIDIA",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 64,
                            "Name": "NZDCAD",
                            "FullName": "NZD/CAD",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 201,
                            "Name": "NZDCHF",
                            "FullName": "NZD/CHF",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 112,
                            "Name": "NZDJPY",
                            "FullName": "NZD/JPY",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 162,
                            "Name": "NZDSGD",
                            "FullName": "NZD/SGD",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 24,
                            "Name": "NZDUSD",
                            "FullName": "NZD/USD",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 175,
                            "Name": "NSQUSD",
                            "FullName": "Nasdaq",
                            "Category": "Index",
                            "isPopular": false
                        },
                        {
                            "ID": 150,
                            "Name": "NatComBank",
                            "FullName": "NatComBnk",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 198,
                            "Name": "NatlGasInd",
                            "FullName": "NatlGasInd",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 138,
                            "Name": "XNGUSD",
                            "FullName": "Natural Gas (US)",
                            "Category": "Commodity",
                            "isPopular": false
                        },
                        {
                            "ID": 26,
                            "Name": "NETB",
                            "FullName": "NetEnt",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 168,
                            "Name": "NFLX",
                            "FullName": "Netflix",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 182,
                            "Name": "NKYJPY",
                            "FullName": "Nikkei 225",
                            "Category": "Index",
                            "isPopular": false
                        },
                        {
                            "ID": 231,
                            "Name": "NKLA",
                            "FullName": "Nikola Corporation",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 104,
                            "Name": "GMKN",
                            "FullName": "NorNikel",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 232,
                            "Name": "NVAX",
                            "FullName": "Novavax",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 177,
                            "Name": "NUS",
                            "FullName": "Nu Skin Enterprises",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 209,
                            "Name": "OMGUSD",
                            "FullName": "OMISEGO",
                            "Category": "CryptoCurrency",
                            "isPopular": false
                        },
                        {
                            "ID": 25,
                            "Name": "PacificSec",
                            "FullName": "PacificSec",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 140,
                            "Name": "XPDUSD",
                            "FullName": "Palladium (USD)",
                            "Category": "Commodity",
                            "isPopular": false
                        },
                        {
                            "ID": 237,
                            "Name": "PYPL",
                            "FullName": "PayPal",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 116,
                            "Name": "PetroChina",
                            "FullName": "PetroChina",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 33,
                            "Name": "PetroRabigh",
                            "FullName": "PetroRabigh",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 127,
                            "Name": "PFE",
                            "FullName": "Pfizer",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 248,
                            "Name": "PM",
                            "FullName": "Philip Morris",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 145,
                            "Name": "XPTUSD",
                            "FullName": "Platinum  (USD)",
                            "Category": "Commodity",
                            "isPopular": false
                        },
                        {
                            "ID": 95,
                            "Name": "QIWI",
                            "FullName": "Qiwi",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 73,
                            "Name": "RWE",
                            "FullName": "RWE",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 193,
                            "Name": "RNO",
                            "FullName": "Renault",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 118,
                            "Name": "RIO",
                            "FullName": "RioTinto",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 219,
                            "Name": "XRPUSD",
                            "FullName": "Ripple",
                            "Category": "CryptoCurrency",
                            "isPopular": false
                        },
                        {
                            "ID": 217,
                            "Name": "RiyadBank",
                            "FullName": "RiyadBank",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 204,
                            "Name": "ROG",
                            "FullName": "Roche Holding",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 185,
                            "Name": "ROSN",
                            "FullName": "Rosneft",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 6,
                            "Name": "RDSB",
                            "FullName": "Royal Dutch Shell",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 94,
                            "Name": "SP5USD",
                            "FullName": "S&P 500",
                            "Category": "Index",
                            "isPopular": false
                        },
                        {
                            "ID": 221,
                            "Name": "SAP",
                            "FullName": "SAP",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 91,
                            "Name": "SGDJPY",
                            "FullName": "SGD/JPY",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 67,
                            "Name": "SambaGroup",
                            "FullName": "SambaGroup",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 75,
                            "Name": "SANO",
                            "FullName": "Sanofi",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 218,
                            "Name": "SAN",
                            "FullName": "Santander",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 137,
                            "Name": "SaudiElectro",
                            "FullName": "SaudElicrto",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 192,
                            "Name": "SaudiBasic",
                            "FullName": "SaudiBasic",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 184,
                            "Name": "SaudiBriBank",
                            "FullName": "SaudiBriBank",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 153,
                            "Name": "SaudiInvBank",
                            "FullName": "SaudiInvBank",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 146,
                            "Name": "SaudiKayan",
                            "FullName": "SaudiKayan",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 133,
                            "Name": "SBER",
                            "FullName": "Sberbank",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 142,
                            "Name": "SMG",
                            "FullName": "Scotts Miracle-Gro",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 109,
                            "Name": "SSTI",
                            "FullName": "ShotSpotter",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 77,
                            "Name": "SIE",
                            "FullName": "Siemens",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 245,
                            "Name": "XAGUSD",
                            "FullName": "Silver (USD)",
                            "Category": "Commodity",
                            "isPopular": true
                        },
                        {
                            "ID": 241,
                            "Name": "SNAP",
                            "FullName": "Snapchat",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 159,
                            "Name": "SNE",
                            "FullName": "Sony Corp",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 139,
                            "Name": "SPOT",
                            "FullName": "Spotify Technology",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 69,
                            "Name": "XLMUSD",
                            "FullName": "Stellar Lumen",
                            "Category": "CryptoCurrency",
                            "isPopular": false
                        },
                        {
                            "ID": 84,
                            "Name": "RGR",
                            "FullName": "Sturm Ruger",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 39,
                            "Name": "TRYJPY",
                            "FullName": "TRY/JPY",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 23,
                            "Name": "TGT",
                            "FullName": "Target Corporation",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 2,
                            "Name": "TSLA",
                            "FullName": "Tesla",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 76,
                            "Name": "TKA",
                            "FullName": "ThyssenKrupp",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 60,
                            "Name": "TM",
                            "FullName": "Toyota Motor",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 197,
                            "Name": "USOUSD",
                            "FullName": "U.S. Crude Oil",
                            "Category": "Commodity",
                            "isPopular": true
                        },
                        {
                            "ID": 149,
                            "Name": "USDCAD",
                            "FullName": "USD/CAD",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 103,
                            "Name": "USDCHF",
                            "FullName": "USD/CHF",
                            "Category": "Currency",
                            "isPopular": true
                        },
                        {
                            "ID": 202,
                            "Name": "USDCNH",
                            "FullName": "USD/CNH",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 14,
                            "Name": "USDCZK",
                            "FullName": "USD/CZK",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 87,
                            "Name": "USDDKK",
                            "FullName": "USD/DKK",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 224,
                            "Name": "USDHKD",
                            "FullName": "USD/HKD",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 1,
                            "Name": "USDHUF",
                            "FullName": "USD/HUF",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 129,
                            "Name": "USDJPY",
                            "FullName": "USD/JPY",
                            "Category": "Currency",
                            "isPopular": true
                        },
                        {
                            "ID": 169,
                            "Name": "USDMXN",
                            "FullName": "USD/MXN",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 18,
                            "Name": "USDNOK",
                            "FullName": "USD/NOK",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 130,
                            "Name": "USDPLN",
                            "FullName": "USD/PLN",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 66,
                            "Name": "USDRUB",
                            "FullName": "USD/RUB",
                            "Category": "Currency",
                            "isPopular": true
                        },
                        {
                            "ID": 80,
                            "Name": "USDSEK",
                            "FullName": "USD/SEK",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 115,
                            "Name": "USDSGD",
                            "FullName": "USD/SGD",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 225,
                            "Name": "USDTRY",
                            "FullName": "USD/TRY",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 163,
                            "Name": "USDZAR",
                            "FullName": "USD/ZAR",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 234,
                            "Name": "UBER",
                            "FullName": "Uber",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 51,
                            "Name": "VISA",
                            "FullName": "VISA",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 135,
                            "Name": "VOW3",
                            "FullName": "VolksWagen",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 20,
                            "Name": "WMT",
                            "FullName": "WalMart",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 55,
                            "Name": "DIS",
                            "FullName": "Walt Disney",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 100,
                            "Name": "WU",
                            "FullName": "Western Union",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 22,
                            "Name": "YNDX",
                            "FullName": "Yandex",
                            "Category": "Stock",
                            "isPopular": false
                        },
                        {
                            "ID": 74,
                            "Name": "ZARJPY",
                            "FullName": "ZAR/JPY",
                            "Category": "Currency",
                            "isPopular": false
                        },
                        {
                            "ID": 54,
                            "Name": "ZECUSD",
                            "FullName": "Zcash",
                            "Category": "CryptoCurrency",
                            "isPopular": false
                        },
                        {
                            "ID": 143,
                            "Name": "ZM",
                            "FullName": "Zoom Video Communications",
                            "Category": "Stock",
                            "isPopular": false
                        }
                    ]
                },
                "activeTab": "tab-1",
                "groupCharts": {
                    "tab-1": {
                        "activeIndex": 0,
                        "activeTabSpliter": 0,
                        "name": "EUR/USD",
                        "chartData": [
                            {
                                "id": 4,
                                "chartType": "candle",
                                "cursorType": "arrow",
                                "period": "60",
                                "timeMode": "local",
                                "options": {
                                    "Chart": {
                                        "typeTick": "Default",
                                        "autoScale": true,
                                        "ohlcValues": true,
                                        "typeThemes": "defaultThema",
                                        "needPriceLine": true,
                                        "typeCrossHair": "points",
                                        "widthPriceLine": 2,
                                        "widthCrossHair": 1,
                                        "scalesFontSize": 12,
                                        "scaleSeriesOnly": true,
                                        "indicatorTitles": true,
                                        "indicatorValues": true,
                                        "priceLineOpacity": 0.4,
                                        "typeVertGridLines": "normal",
                                        "typeHorzGridLines": "normal",
                                        "symbolDescription": true,
                                        "indicatorArguments": true,
                                        "needPriceOscillators": true,
                                        "minMaxPricesMarks": {
                                            "mode": "low_high",
                                            "isShow": false
                                        },
                                        "listThemes": [
                                            "defaultthema",
                                            "blackthema",
                                            "bluethema",
                                            "greythema",
                                            "darkthema",
                                            "whitethema"
                                        ],
                                        "listTemesDesign": [
                                            "darkthema"
                                        ],
                                        "fireflyRadius": 2.5,
                                        "fireflyOuterRadius": 20,
                                        "fireflyOpacityDelta": 0.01,
                                        "labelArrowWidth": 6,
                                        "labelPaddingTop": 2,
                                        "labelPaddingLeft": 7,
                                        "labelFont": "Roboto, sans-serif",
                                        "dateLabelArrowHeight": 5,
                                        "dateLabelPaddingTop": 2,
                                        "dateLabelTextInterval": 3,
                                        "dateLabelPaddingBottom": 5,
                                        "dateLabelPaddingLeftRight": 3,
                                        "candleTimer": true,
                                        "indicatorMaxParam": 300
                                    },
                                    "Signals": {
                                        "chartPattern": {
                                            "supportLine": {
                                                "strokeWidth": 1
                                            },
                                            "resistanceLine": {
                                                "strokeWidth": 1
                                            },
                                            "patternEndLine": {
                                                "strokeWidth": 2
                                            },
                                            "directionArrow": {
                                                "strokeWidth": 1
                                            }
                                        },
                                        "keyLevelsPattern": {
                                            "patternLine": {
                                                "strokeWidth": 1
                                            },
                                            "patternEndLine": {
                                                "strokeWidth": 2
                                            },
                                            "directionArrow": {
                                                "strokeWidth": 1
                                            },
                                            "predictionLine": {
                                                "strokeWidth": 1
                                            },
                                            "predictionArea": {
                                                "strokeWidth": 1
                                            }
                                        },
                                        "fibonacciPattern": {
                                            "levelLines": {
                                                "textFont": "11px sans-serif",
                                                "strokeWidth": 1,
                                                "textAlignment": "center"
                                            },
                                            "patternLines": {
                                                "textFont": "16px sans-serif",
                                                "strokeWidth": 1,
                                                "textAlignment": "center",
                                                "textVerticalOffset": 8
                                            },
                                            "patternEndLine": {
                                                "strokeWidth": 2
                                            },
                                            "directionArrow": {
                                                "strokeWidth": 1
                                            },
                                            "predictionArrow": {
                                                "strokeWidth": 1
                                            },
                                            "predictionPoint": {
                                                "radius": 3,
                                                "lineWidth": 2
                                            },
                                            "dashedPatternLines": {
                                                "strokeWidth": 2
                                            }
                                        }
                                    },
                                    "CandleChart": {
                                        "needWick": true,
                                        "needBorder": true,
                                        "widthWickLine": 1,
                                        "widthBorderLine": 2
                                    },
                                    "HollowChart": {
                                        "needWick": true,
                                        "needBorder": true,
                                        "widthWickLine": 1,
                                        "widthBorderLine": 1
                                    },
                                    "LineChart": {
                                        "typeLine": "Simple",
                                        "widthLine": 2,
                                        "priceSource": "Close"
                                    },
                                    "AreaChart": {
                                        "priceSource": "Close",
                                        "widthLine": 2
                                    },
                                    "BarChart": {
                                        "needOpen": false
                                    },
                                    "HeikinAshiChart": {
                                        "needWick": true,
                                        "needBorder": true,
                                        "widthBorderLine": 1,
                                        "widthWickLine": 1
                                    }
                                },
                                "colors": {
                                    "Chart": {
                                        "pipsColor": "#18A0FB",
                                        "scalesText": "#CAD6DD",
                                        "colorFirefly": "rgb(255, 153, 0)",
                                        "vertGridLines": "rgba(24, 160, 251, 0.10)",
                                        "horzGridLines": "rgba(24, 160, 251, 0.10)",
                                        "crossLineColor": "#18A0FB",
                                        "watermarkColor": "rgba(24, 160, 251, 0.10)",
                                        "backgroundColor": "rgba(255, 255, 255, 0)",
                                        "colorScalesLines": "rgba(255, 255, 255, 0)",
                                        "colorFireflyInner": "#FFFFFF",
                                        "crossLabelTextColor": "#FFFFFF",
                                        "crossLabelBackgroundColor": "#18A0FB",
                                        "colorMinMaxPricesText": "#000000",
                                        "colorMinMaxPricesFillArrow": "#000000",
                                        "colorMinMaxPricesStrokeArrow": "rgba(255, 255, 255, 0)"
                                    },
                                    "Signals": {
                                        "chartPattern": {
                                            "supportLine": {
                                                "color": "#4672aa"
                                            },
                                            "resistanceLine": {
                                                "color": "#63b089"
                                            },
                                            "directionArrow": {
                                                "strokeColor": "#ffffff",
                                                "supportColor": "#ff0000",
                                                "resistanceColor": "#63b089"
                                            },
                                            "patternEndLine": {
                                                "color": "#ff0000"
                                            },
                                            "predictionLines": {
                                                "color": "#4672aa"
                                            },
                                            "predictionArea": {
                                                "color": "rgba(50, 50, 50, 0.3)",
                                                "borderColor": "#ff0000"
                                            }
                                        },
                                        "keyLevelsPattern": {
                                            "predictionLine": {
                                                "color": "#f6d002"
                                            },
                                            "patternEndLine": {
                                                "color": "#ff0000"
                                            },
                                            "predictionArea": {
                                                "color": "rgba(50, 50, 50, 0.3)",
                                                "borderColor": "#ff0000"
                                            },
                                            "patternLine": {
                                                "supportColor": "#4672aa",
                                                "resistanceColor": "#63b089"
                                            },
                                            "directionArrow": {
                                                "strokeColor": "#ffffff",
                                                "supportColor": "#ff0000",
                                                "resistanceColor": "#63b089"
                                            }
                                        },
                                        "fibonacciPattern": {
                                            "levelLines": {
                                                "color": "#ffffff",
                                                "textColor": "#ffffff"
                                            },
                                            "patternLines": {
                                                "color": "#1266AF",
                                                "textColor": "#ffffff"
                                            },
                                            "directionArrow": {
                                                "color": "#787878"
                                            },
                                            "patternEndLine": {
                                                "color": "#ff0000"
                                            },
                                            "predictionArrow": {
                                                "color": "#787878"
                                            },
                                            "predictionPoint": {
                                                "color": "#fb00fb"
                                            },
                                            "dashedPatternLines": {
                                                "color": "#1266AF"
                                            }
                                        }
                                    },
                                    "CandleChart": {
                                        "candleBear": "#D1193E",
                                        "candleBool": "#2FC265",
                                        "stopLossColor": "#18A0FB",
                                        "candleLineBear": "#ABB4BB",
                                        "candleLineBool": "#ABB4BB",
                                        "takeProfitColor": "#2FC265",
                                        "candleBearBorder": "#D1193E",
                                        "candleBoolBorder": "#2FC265",
                                        "pnlPredictionNmtTextColor": "#2FC265",
                                        "pnlPredictionNmtScaleColor": "#263845",
                                        "pnlPredictionLossTextColor": "#2FC265",
                                        "pnlPredictionLossScaleColor": "#2FC265",
                                        "pnlPredictionProfitTextColor": "#2FC265",
                                        "pnlPredictionProfitScaleColor": "#2FC265",
                                        "pnlPredictionDirectionTextNmtColor": "#ABB4BB",
                                        "pnlPredictionBuyDirectionTextColor": "#2FC265",
                                        "pnlPredictionSellDirectionTextColor": "#D1193E",
                                        "pnlPredictionDirectionBackgroundColor": "#ABB4BB"
                                    },
                                    "HollowChart": {
                                        "candleBear": "#D1193E",
                                        "candleBool": "#2FC265",
                                        "stopLossColor": "#18A0FB",
                                        "candleLineBear": "#ABB4BB",
                                        "candleLineBool": "#ABB4BB",
                                        "takeProfitColor": "#2FC265",
                                        "candleBearBorder": "#D1193E",
                                        "candleBoolBorder": "#2FC265",
                                        "pnlPredictionNmtTextColor": "#2FC265",
                                        "pnlPredictionNmtScaleColor": "#263845",
                                        "pnlPredictionLossTextColor": "#2FC265",
                                        "pnlPredictionLossScaleColor": "#2FC265",
                                        "pnlPredictionProfitTextColor": "#2FC265",
                                        "pnlPredictionProfitScaleColor": "#2FC265",
                                        "pnlPredictionDirectionTextNmtColor": "#ABB4BB",
                                        "pnlPredictionBuyDirectionTextColor": "#2FC265",
                                        "pnlPredictionSellDirectionTextColor": "#D1193E",
                                        "pnlPredictionDirectionBackgroundColor": "#ABB4BB"
                                    },
                                    "LineChart": {
                                        "colorLine": "#18A0FB",
                                        "priceLine": "rgba(24, 160, 251, 0.25)",
                                        "stopLossColor": "#18A0FB",
                                        "takeProfitColor": "#2FC265",
                                        "pnlPredictionNmtTextColor": "#2FC265",
                                        "pnlPredictionNmtScaleColor": "#263845",
                                        "pnlPredictionLossTextColor": "#2FC265",
                                        "pnlPredictionLossScaleColor": "#2FC265",
                                        "pnlPredictionProfitTextColor": "#2FC265",
                                        "pnlPredictionProfitScaleColor": "#2FC265",
                                        "pnlPredictionDirectionTextNmtColor": "#ABB4BB",
                                        "pnlPredictionBuyDirectionTextColor": "#2FC265",
                                        "pnlPredictionSellDirectionTextColor": "#D1193E",
                                        "pnlPredictionDirectionBackgroundColor": "#ABB4BB"
                                    },
                                    "AreaChart": {
                                        "colorLine": "#18A0FB",
                                        "colorStop": "rgba(252, 165, 1, 0.4)",
                                        "priceLine": "rgba(24, 160, 251, 0.25)",
                                        "colorStopEnd": "rgba(247, 111, 26, 0)",
                                        "stopLossColor": "#18A0FB",
                                        "takeProfitColor": "#2FC265",
                                        "pnlPredictionNmtTextColor": "#2FC265",
                                        "pnlPredictionNmtScaleColor": "#263845",
                                        "pnlPredictionLossTextColor": "#2FC265",
                                        "pnlPredictionLossScaleColor": "#2FC265",
                                        "pnlPredictionProfitTextColor": "#2FC265",
                                        "pnlPredictionProfitScaleColor": "#2FC265",
                                        "pnlPredictionDirectionTextNmtColor": "#ABB4BB",
                                        "pnlPredictionBuyDirectionTextColor": "#2FC265",
                                        "pnlPredictionSellDirectionTextColor": "#D1193E",
                                        "pnlPredictionDirectionBackgroundColor": "#ABB4BB"
                                    },
                                    "BarChart": {
                                        "candleBear": "#D1193E",
                                        "candleBool": "#2FC265",
                                        "stopLossColor": "#18A0FB",
                                        "takeProfitColor": "#2FC265",
                                        "pnlPredictionNmtTextColor": "#2FC265",
                                        "pnlPredictionNmtScaleColor": "#263845",
                                        "pnlPredictionLossTextColor": "#2FC265",
                                        "pnlPredictionLossScaleColor": "#2FC265",
                                        "pnlPredictionProfitTextColor": "#2FC265",
                                        "pnlPredictionProfitScaleColor": "#2FC265",
                                        "pnlPredictionDirectionTextNmtColor": "#ABB4BB",
                                        "pnlPredictionBuyDirectionTextColor": "#2FC265",
                                        "pnlPredictionSellDirectionTextColor": "#D1193E",
                                        "pnlPredictionDirectionBackgroundColor": "#ABB4BB"
                                    },
                                    "HeikinAshiChart": {
                                        "candleBear": "#CD2F47",
                                        "candleBool": "#8CC63F",
                                        "candleBearBorder": "#550000",
                                        "candleBoolBorder": "#004600",
                                        "candleLineBear": "#898989",
                                        "candleLineBool": "#898989"
                                    }
                                },
                                "pair": {
                                    "ID": 4,
                                    "Name": "EURUSD",
                                    "FullName": "EUR/USD",
                                    "Category": "Currency"
                                },
                                "candleWidth": 6,
                                "scaleParams": {
                                    "minB": "1.21151",
                                    "maxB": "1.22803",
                                    "deltaY": 0.00005358471,
                                    "minV": 1.21259,
                                    "maxV": 1.22535
                                },
                                "startX": 220.39687500000002,
                                "startY": 0,
                                "isDrawingObjectsLocked": false,
                                "indicators": [],
                                "drawingObjects": [],
                                "zoomData": {},
                                "zoomSteps": [],
                                "isShowDrawingObjects": true,
                                "isStayDrawingMode": false,
                                "isMagnetMode": false,
                                "isPipsShow": true,
                                "state": "default",
                                "startDateSeconds": 1622736000,
                                "h": 308.296875,
                                "top": 0,
                                "typeData": "bid",
                                "parentRect": {
                                    "bottom": 449.296875,
                                    "height": 342.296875,
                                    "left": 452.046875,
                                    "right": 1607.03125,
                                    "top": 107,
                                    "width": 1154.984375
                                },
                                "isShowSignalsBody": false,
                                "isShowAllSignals": false,
                                "newsData": {
                                    "currentFrom": null,
                                    "currentTo": null,
                                    "news": []
                                },
                                "precission": 5,
                                "isExpired": false,
                                "currentTabId": "tab-1"
                            }
                        ]
                    }
                },
                "initializationDone": true,
                "platformVersion": "2.4"
            },
            "isShowSlTpLines": false,
            "pinnedChartTabs": [],
            "savedLayoutName": null,
            "unpinnedChartTabs": [
                "tab-1"
            ],
            "isShowDrawingPanel": false,
            "isHideAnimatedGrid": false,
            "isShowPnlPrediction": false
        },
        "layout": {
            "layoutName": "light_2",
            "contentControllers": {
                "1_1": {
                    "isTabCloseEnable": false,
                    "isShowTabNavigator": false,
                    "isModuleSelectEnable": false,
                    "availableModules": {
                        "instrumentListSimple": true
                    },
                    "activeTab": "instrumentListSimple",
                    "modulesViews": {
                        "instrumentListSimple": "View2"
                    }
                },
                "1_2": {
                    "isTabCloseEnable": false,
                    "isShowTabNavigator": false,
                    "isModuleSelectEnable": false,
                    "availableModules": {
                        "trading": true
                    },
                    "activeTab": "trading",
                    "modulesViews": {
                        "trading": "View2"
                    }
                },
                "2_1": {
                    "isTabCloseEnable": false,
                    "isShowTabNavigator": false,
                    "isModuleSelectEnable": false,
                    "availableModules": {
                        "chart": true
                    },
                    "activeTab": "chart"
                },
                "2_2": {
                    "isTabCloseEnable": false,
                    "isShowTabNavigator": true,
                    "isModuleSelectEnable": false,
                    "isModuleExpandEnable": true,
                    "availableModules": {
                        "openPositions": true,
                        "limitOrders": true,
                        "closedDeals": true,
                        "economicalCalendar": true,
                        "technicalAnalysis": true,
                        "tradingSignals": false
                    },
                    "activeTab": "openPositions"
                }
            }
        },
        "instrumentList": {
            "groups": {
                "Stock": {
                    "selectedSubMarket": ""
                },
                "Currency": {
                    "selectedSubMarket": ""
                },
                "Index": {
                    "selectedSubMarket": ""
                },
                "CryptoCurrency": {
                    "selectedSubMarket": ""
                },
                "Commodity": {
                    "selectedSubMarket": ""
                }
            },
            "selectedGroup": "All",
            "selectedInstrument": "EURUSD"
        },
        "filterTradingSignals": {
            "direction": "buyAndSell",
            "minStrength": 60
        },
        "tradingSignals": {
            "selectedTab": "activeSignal"
        },
        "recommendations": {
            "selectedTab": "trading"
        },
        "technicalAnalysis": {
            "selectedGroup": "Popular"
        }
    }`
    // const localStorageJSON = fs.readFileSync(path.resolve(__dirname, 'LS.json'))
    // const localStorage = JSON.stringify(localStorageJSON);
    const localStorageValues = {
        [email]: localStorageJSON
    };



    try {
        // const picture = await browser.screenshot(headers, url, options, viewport, waitUntil)
        const picture = await getScreenshot(main, localStorageValues, cookiesValues)
        res.status(200).set('Content-type', 'image/png').send(picture)
    } catch(e) {
        res.status(500)
            .send(`Puppeteer Failed`)
          // - url: ${url}
          // - screenshot options: ${JSON.stringify(options)}
          // - viewport: ${JSON.stringify(viewport)}
          // - waitUntil: ${waitUntil}
          // - stacktrace: \n\n${e.stack}`)
    }
})

// app.get('/jpeg', async (req: Request, res: Response): Promise<void> => {
//     if (!req.query.url || !isValidUrl(req.query.url)) {
//         res.status(422)
//             .send('need a url')
//         return
//     }
//     const url = decodeURIComponent(req.query.url)
//
//     const [ viewport, options, waitUntil ] = getPropertiesFromImg(req.query)
//
//     options.type = 'jpeg'
//
//     const headers = transformHeaders(req.rawHeaders)
//
//     try {
//         const picture = await browser.screenshot(headers, url, options, viewport, waitUntil)
//         res.status(200)
//             .set('Content-type', 'image/jpeg')
//             .send(picture)
//     } catch(e) {
//         res.status(500)
//             .send(`Puppeteer Failed
//       - url: ${url}
//       - screenshot options: ${JSON.stringify(options)}
//       - viewport: ${JSON.stringify(viewport)}
//       - waitUntil: ${waitUntil}
//       - stacktrace: \n\n${e.stack}`)
//     }
// })
//
// app.get('/pdf', async (req: Request, res: Response): Promise<void> => {
//     if (!req.query.url || !isValidUrl(req.query.url)) {
//         res.status(422)
//             .send('need a url')
//         return
//     }
//     const url = decodeURIComponent(req.query.url)
//
//     const [ viewport, pdfOptions, waitUntil ] = getPropertiesFromPdf(req.query)
//
//     const headers = transformHeaders(req.rawHeaders)
//
//     try {
//         const pdfBuffer = await browser.pdf(headers, url, viewport, pdfOptions, waitUntil)
//         res.status(200)
//             .set('Content-type', 'application/pdf')
//             .send(pdfBuffer)
//     } catch(e) {
//         res.status(500)
//             .send(`Puppeteer Failed
//         - url: ${url}
//         - pdf options: ${JSON.stringify(pdfOptions)}
//         - viewport: ${JSON.stringify(viewport)}
//         - waitUntil: ${waitUntil}
//         - stacktrace: \n\n${e.stack}`)
//     }
// })

app.listen(port, () => console.log(`server listening on port ${port}`))

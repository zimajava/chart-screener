import fs from "fs";
import path from "path";
import express from 'express';
import {Request, Response} from 'express';
import puppeteer from 'puppeteer'
import axios from 'axios';
import cors from "cors";

import {PageRes} from './capture/pageres';

const app = express()
const port = process.env.PORT || 3050;
const isProd = process.env.NODE_ENV === 'production'

app.use(cors())

app.post('/auth', async (req: Request, res: Response) => {
    try {
        const isProd = true
        const email = isProd ? "alexander.ivanov.0405@gmail.com" : "devtest@i.ua"
        const pass = isProd ? "123qwe" : "Dev123123"
        const tid = new Date().getTime()
        const body = {"user": email, "pwd": pass, "needpack": true, "clienttype": "webLightDesktop", "rabbitOff": true}
        const url = `https://${isProd ? '' : 'dev-'}light-trading.umarkets.ai`
        const auth = `${url}/auth/`

        const {data, headers} = await axios.post(auth, body)

        const setCookie = headers['set-cookie']
        const unSession = setCookie[0]?.split(';')[0]?.split('=')[1] || ''
        const sid = data ? data.sid : ''
        const su = data ? data.stompUser : ''
        const sp = data ? data.stompPassword : ''

        const cookies = setCookie.map((cookie) => {
            const temp = {
                "name": "",
                "value": "",
                "domain": ".umarkets.ai",
                "path": "/",
                "httpOnly": false,
                "secure": false,
                "session": false,
                "sameParty": false,
            }
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
                "value": platformParamValue.toString(),
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

        cookiesValues.forEach(({name, value}) => {
            // console.log({ name, value })
            res.cookie(name, value)
        })

        res.status(200).set('Content-type', 'application/json').send(JSON.stringify(data))
    } catch (e) {
        console.error(e)
        res.status(500).send(`auth failed`)
    }
})

app.get('/:tid/:assetName/:timeframe', async (req: Request, res: Response) => {
    const { tid, assetName, timeframe } = req.params

    try {
        const resolve = (p: string) => path.resolve(process.cwd(), p)

        const tchJsPath = isProd ? resolve('technicalChart/TechChartLib.js') : resolve('../../technicalChart/TechChartLib.js')
        const tchCssPath = isProd ? resolve('technicalChart/TechChartLib.css') : resolve('../../technicalChart/TechChartLib.css')
        const settingsPath = isProd ? resolve('data/settings.json') : resolve('../../data/settings.json')

        const settings = fs.readFileSync(settingsPath, { encoding: 'utf8' })

        const pair = JSON.parse(settings)[assetName]

        console.log('tid =>', tid, '| pair =>', JSON.stringify(pair), '| timeframe =>', timeframe)

        const html = `data:text/html,<div id="container" class="container"></div><div id="pair">${JSON.stringify(pair)}</div><div id="timeframe">${timeframe}</div>`

        const pictureArr = await new PageRes({delay: 1})
            .src(html.toString(),
                ['800x600'],
                {
                    script: [tchJsPath],
                    css: [tchCssPath],
                    debug: false,
                    launchOptions: {
                        waitForInitialPage: true,
                        // devtools: true,
                        // headless: false,
                        args: [
                            '--no-sandbox',
                            '--disable-setuid-sandbox'
                        ]
                    },
                    selector: '.tch-charts-container',
                    remove: ['.tch-spinner-container'],
                }
            )
            .run();

        console.log('Finished generating screenshots!');

        res.status(200).set('Content-type', 'image/png').send(pictureArr[0])
    } catch (e) {
        console.error(e)
        res.status(500).send(`Screenshot not available`)
    }
})

app.get('/png', async (req: Request, res: Response) => {
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
            waitForInitialPage: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });


        await setDomainLocalStorage(browser, url, localStorageValues, cookiesValues);

        const page = await browser.newPage();
        await page.goto(url, {waitUntil: 'networkidle0'});
        try {
            return await page.screenshot({type: 'png', clip: {x: 367, y: 107, width: 717.1875, height: 334.34375}});
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

    const setCookie = headers['set-cookie']
    const unSession = setCookie[0]?.split(';')[0]?.split('=')[1] || ''
    const sid = data ? data.sid : ''
    const su = data ? data.stompUser : ''
    const sp = data ? data.stompPassword : ''

    const cookies = setCookie.map((cookie) => {
        const temp = {
            "name": "",
            "value": "",
            "domain": ".umarkets.ai",
            "path": "/",
            "httpOnly": false,
            "secure": false,
            "session": false,
            "sameParty": false,
        }
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
            "value": platformParamValue.toString(),
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

    let localStorageJSON = fs.readFileSync(path.resolve(process.cwd(), 'data/localstorage.json'))
    const localStorageValues = {
        [email]: localStorageJSON
    };


    try {
        const picture = await getScreenshot(main, localStorageValues, cookiesValues)
        res.status(200).set('Content-type', 'image/png').send(picture)
    } catch (e) {
        res.status(500).send(`Screenshot not available`)
    }
})

app.listen(port, () => console.log(`server listening on port ${port}`))

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const axios = require('axios');
const { RequestInterceptor, ResponseModifier, ResponseFaker } = require('puppeteer-request-spy');

const setDomainLocalStorage = async (browser, url, localStorageValues, cookiesValues) => {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', r => r.respond({status: 200, contentType: 'text/plain', body: 'tweak me.',}));
    await page.goto(url);
    await page.evaluate(values => {
        for (const key in values) {
            localStorage.setItem(key, values[key]);
        }
    }, localStorageValues);
    await page.setCookie(...cookiesValues)
    await page.close();
};

const getScreenshot = async (mainUrl, localStorageValues, cookiesValues, email, configUrlBase) => {
    const browser = await puppeteer.launch({headless: false, waitForInitialPage: true, args: ['--no-sandbox', '--disable-setuid-sandbox'],});
    await setDomainLocalStorage(browser, mainUrl, localStorageValues, cookiesValues);
    const page = await browser.newPage();

    function KeywordMatcher(testee, keyword) {
        return testee.indexOf(keyword) > -1;
    }
    let requestInterceptor = new RequestInterceptor(KeywordMatcher, console);
    let responseModifier = new ResponseModifier(configUrlBase, (error, response, request) => {
        const modifiedRes = JSON.parse(response)
        modifiedRes.takeATour = { isEnable: false }
        modifiedRes.tradingInstrumentSettings.defaultInstrument = "ABBV"

        return JSON.stringify(modifiedRes);
    });
    // promise callback options
    let responseFaker = new ResponseFaker(
        '/ajax/some-request',
        (matchedRequest) => Promise.resolve(({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({successful: false, payload: []})
        }))
    );
    requestInterceptor.addFaker(responseModifier);
    await page.setRequestInterception(true);
    page.on('request', requestInterceptor.intercept.bind(requestInterceptor));

    await page.setDefaultNavigationTimeout(0)
    await page.goto(mainUrl, {waitUntil: 'networkidle0'});

    await page.waitForTimeout(15000)

    // const cookies = await page.cookies()
    // const cookieJson = JSON.stringify(cookies)
    // try {
    //     fs.writeFileSync('light-trading/cookies.json', cookieJson)
    // } catch (e) {
    //     console.error('Write cookies to file error', e)
    // }
    //
    // const localStorage = await page.evaluate((val) => {
    //     return localStorage[val] || JSON.stringify({})
    // }, email);
    //
    // try {
    //     fs.writeFileSync('light-trading/localstorage.json', localStorage)
    // } catch (e) {
    //     console.error('Write localstorage to file error', e)
    // }

    try {
        return await page.screenshot({ type: 'png', clip: {x: 367, y: 107, width: 717.1875, height: 334.34375} });
    } catch (e) {
        console.error('Screenshot error', e)
    } finally {
        await page.close();
        await browser.close();
    }
};

async function start(isProd) {
    const email = isProd ? "alexander.ivanov.0405@gmail.com" : "devtest@i.ua"
    const pass = isProd ? "123qwe" : "Dev123123"
    const tid = new Date().getTime()
    const body = {"user": email, "pwd": pass, "needpack": true, "clienttype": "webLightDesktop", "rabbitOff": true}
    const url = `https://${isProd ? '' : 'dev-'}light-trading.umarkets.ai`
    const authUrl = `${url}/auth/`
    const mainUrl = `${url}/index.html?tid=${tid}`
    const configUrlBase = `${url}/cfg/config.json`
    const configUrl = `${configUrlBase}?v=${tid}`

    let authRes

    try {
        authRes = await axios.post(authUrl, body)
        // console.log(data, headers)
    } catch (e) {
        console.error('Auth error', e)
    }

    try {
        const configData = await axios.get(configUrl)
        fs.writeFileSync('config.json', JSON.stringify(configData.data))
        // console.log(configData.data)
    } catch (e) {
        console.error('Config error', e)
    }

    const data = authRes.data
    const setCookie = authRes.headers['set-cookie']
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

    const localStorageJSON = fs.readFileSync(path.resolve(process.cwd(), 'light-trading/localstorage.json'))
    const localStorageValues = {
        [email]: localStorageJSON
    };

    try {
        const img = await getScreenshot(mainUrl, localStorageValues, cookiesValues, email, configUrlBase)
        const name = new Date().getTime().toString()
        fs.writeFileSync(path.resolve(process.cwd(), `download/${name}.png`), img)
    } catch (e) {
        console.error('getScreenshot error', e)
    }

}

start(false)

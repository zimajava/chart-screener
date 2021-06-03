const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const axios = require('axios');

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

const getScreenshot = async (url, localStorageValues, cookiesValues) => {
    const browser = await puppeteer.launch({
        headless: false,
        // defaultViewport: {width: 1920, height: 1080},
        waitForInitialPage: true,
        devtools: false
    });

    await setDomainLocalStorage(browser, url, localStorageValues, cookiesValues);

    const page = await browser.newPage();
    await page.goto(url, {waitUntil: 'networkidle0'});

    // const CREDS = {
    //     username: 'alexander.ivanov.0405@gmail.com',
    //     password: '123qwe'
    // }
    // await page.waitForSelector("#login");
    // await page.waitForSelector("#password");
    // await page.waitForSelector("#btLogin");
    // await page.type('#login', CREDS.username);
    // await page.type('#password', CREDS.password);
    // await Promise.all([
    //     page.click('#btLogin'),
    //     // page.evaluate((CREDS) => {
    //     //     document.getElementById("login").value = CREDS.username
    //     //     document.getElementById("password").value = CREDS.password
    //     //     document.getElementById("btLogin").click()
    //     // }, CREDS),
    //     page.waitForNavigation({waitUntil: 'networkidle0'}),
    // ]);

    // await page.waitForSelector("[data-at='at-chart-fullscreen-button']");
    // await page.evaluate(() => document.querySelector("[data-at='at-chart-fullscreen-button']").click());
    await page.waitForTimeout(150000)

    // const cookies = await page.cookies()
    // const cookieJson = JSON.stringify(cookies)
    // fs.writeFileSync('cookies.json', cookieJson)
    //
    // const localStorage = await page.evaluate(() => JSON.stringify(window.localStorage));
    // fs.writeFileSync('localstorage.json', localStorage)

    const name = new Date().getTime().toString()
    await page.screenshot({path: path.resolve(process.cwd(), `download/${name}.png`), type: 'png', clip: {x: 367, y: 107, width: 717.1875, height: 334.34375}});
    await page.close();
    await browser.close();
};

async function start(isProd) {
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

    const localStorageJSON = fs.readFileSync(path.resolve(__dirname, 'LS.json'))
    // const localStorage = JSON.stringify(localStorageJSON);
    const localStorageValues = {
        [email]: localStorageJSON
    };

    await getScreenshot(main, localStorageValues, cookiesValues)
}

start(true)

function initConfig() {
    var technicalChart = new TechnicalChart({
        container: document.querySelector('#container'),
        connectorOptions: {
            url: 'https://informer.investforum.ru/wss/api/quotation/',
            wsUrl: 'https://informer.investforum.ru/wss/Server.ashx',
            quotationCountriesUrl: 'https://informer.investforum.ru/wss/quotation/getsettingsFromFile/quotation_countries?json',
            eventsSourceUrl: 'https://informer.investforum.ru/adminapi/settings/geteventssource/',
            newsSourceUrl: 'https://informer.investforum.ru/adminapi/settings/getnewssource/',
            settingsUrl: 'https://informer.investforum.ru/wss/quotation/getsettings?tch=true',
            type: 'widgets',
        },
        config: {
            version: '1.1',
            pair: {
                "ID": 23,
                "Name": "EURUSD",
                "FullName": "EUR/USD",
                "Category": "Currency"
            },
            period: '1',
            lang: 'en',
            defaultLang: 'en',
            isHeaderHidden: true,
            isSidebarHidden: true,
            isFullScreen: false,
            isDataPanel: false,
            defaultId: 23,
            typeThemes: 'dark',
            listTemesDesign: ['darkthema', 'whitethema'],
            offsetChart: 0.2,
            modules: {
                isSideBarCreate: false,
                isHeaderCreate: false,
                chartElements: {
                    hiddenDataPanel: true,
                    isDataPanelCreate: false
                }
            },
            footer: {isFooterCreate: false},
        },
    }, null);
    technicalChart.initialization();
}

setTimeout(() => initConfig(), 200)

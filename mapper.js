// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const settings = require('./data/settingsByName.json');

const mappedSettings = Object.entries(settings).reduce((acc, item) => {
  const [, setting] = item;

  return {
    ...acc,
    [setting.ID]: setting,
  };
}, {});

fs.writeFileSync('./data/settingsByID.json', JSON.stringify(mappedSettings, null, 2));

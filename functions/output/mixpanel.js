var Mixpanel = require('mixpanel');
const Keys = require('./keys');

const MIXPANEL_TOKEN = 'c9edc36b0c9edd86c4fa8a64aa9818d1';

// create an instance of the mixpanel client
var mixpanel = Mixpanel.init(MIXPANEL_TOKEN);

exports.mixpanel = mixpanel;


const mixpanel_importer = Mixpanel.init(MIXPANEL_TOKEN, {
    secret: Keys.mipanel_secret
});

exports.mixpanel_importer = mixpanel_importer;

function importMixPanelEventsAsync(events) {
    return new Promise((resolve, reject) => {
        mixpanel_importer.import_batch(events, resolve);
    })
}
exports.importMixPanelEventsAsync = importMixPanelEventsAsync;

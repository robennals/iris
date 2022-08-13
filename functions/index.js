const functions = require("firebase-functions");
const cors = require('cors')({origin: true});
const _ = require('lodash');
const Api = require('./api/api.js');
const FBUtil = require('./output/fbutil');
const Email = require('./output/email');
const Notifs = require('./output/notifs');


const Signin = require('./api/signin');


var admin = require("firebase-admin");

var serviceAccount = require("./serviceAccountKey.json");
const { ResultStorage } = require("firebase-functions/v1/testLab");
const { getDataAsync } = require("./output/fbutil.js");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://talkwell-default-rtdb.firebaseio.com",
  storageBucket: "talkwell.appspot.com"
});


exports.api = functions.https.onRequest((async (request, response) => {
    console.log('API', request.path);

    if (request.method == 'OPTIONS') {
        cors(request, response, () => {
            response.status(200);
        });
        return;
    }
    // console.log('method', request.method);

    const parts = _.filter(request.path.split('/'));
  
    // console.log('parts', parts);
    // console.log('body', request.body);

    if (parts[0] != 'api' || parts[1] != 'v1') {
        response.status(404);
        response.send('No such API');
        console.log('No such API', parts[0], parts[1]);
      return null;
    }
    const action = parts[2];
    const components = _.map(parts.slice(2), p => decodeURI(p));
    const params = {...request.body, ...request.query};
    const hostname = request.hostname;


    var pAccessKey;
    if (params.userId) {
        console.log('userId', params.userId);
        pAccessKey = getDataAsync(['userPrivate', params.userId, 'accessKey']);
    }
  
    const result = await Api.apiActionAsync({action, components, params});;

    if (params.userId && params.accessKey != await pAccessKey) {
        cors(request, response, () => {
            response.status(403).send('Access denied');
        })
        return;
    }

    if (result.success == false) {
        console.log('request failed', result);
        cors(request, response, () => {
            response.status(400).send(JSON.stringify(result));
        });
        return;
    }

    var pNotifs = null;
    var pUpdate = null;
    var pEmail = null;

    if (result.notifs) {
        pNotifs = Notifs.sendBatchNotifs(result.notifs);
    }

    if (result.updates) {
        pUpdate = FBUtil.applyUpdates(result.updates);
    }

    if (result.emails) {
        pEmail = Email.sendBatchEmails({emails: result.emails});
    }

    await pNotifs;
    // await pNotifData;
    await pUpdate;
    await pEmail;

    if (result.redirect) {
        var port = '';
        var protocol = 'https://';
        // console.log('redirect', hostname, port, protocol);
        if (request.hostname == 'localhost') {
          port = ':5000';
          protocol = 'http://';
        }    
        response.redirect(protocol + hostname + port + result.redirect);      
    } else {
        cors(request, response, () => {
            response.status(result.success ? 200 : 400);
            if (result.data) {
                response.send(JSON.stringify({...result.data, success: true}));
            } else if (result.base64 && result.contentType) {
                response.setHeader('content-type', result.contentType);
                const buffer = Buffer.from(result.base64, 'base64');
                response.send(buffer);
            } else if (result.html) {
                response.send(result.html)
            } else {
                response.send(JSON.stringify(result))
            }
        })
    }
  }))
  
  
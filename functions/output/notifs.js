const ExpoServer = require('expo-server-sdk');
const FBUtil = require('./fbutil');
const Email = require('./email');
const FS = require('fs');
const Mustache = require('mustache');
const _ = require('lodash');
const { user } = require('firebase-functions/v1/auth');


const Expo = ExpoServer.Expo;
const expo = new ExpoServer.Expo();

async function sendNotifForTokenAsync({name, token, title, body, data, badgeCount, silent}) {
  if (!token || !Expo.isExpoPushToken(token)) {
    console.error(`Push token ${token} is not a valid Expo push token`);
    return;
  }

  console.log('sendNotifForToken', name, token, title);

  const message = {
    to: token,
    sound: silent ? null : 'default',
    title: title,
    body: body,
    data: data,
    badge: 1 /* badgeCount */
  }
  // console.log(message);
  // console.log('Calling SDK');
  const tickets = await expo.sendPushNotificationsAsync([message])
  console.log('tickets', name, tickets);
  return tickets;
}

async function sendWebNotifForTokenAsync({webToken, title, body}) {
  console.log('sendWebNotif', webToken, title, body);
  const message = {
    notification: {
      title, body
    }
  }
  try {
    const result = await FBUtil.sendFBMessageAsync(webToken, message);
    console.log('notif result', result);
  } catch (e) {
    console.log('error sending notif: ', e);
  }

}

function getFromNamesForNotifs(notifList) {
  var nameSet = {};
  _.forEach(notifList, notif => {
    nameSet[notif.data.fromName] = true;
  })
  return _.keys(nameSet);
}

function commaSepStrings(strings) {
  const length = strings.length;
  return strings.map((str,i) => 
    (i == 0 ? '' : (i == length - 1 ? (length == 2 ? ' and ' : ', and ') : ', '))
    + str
  )  
}

async function sendEmailForNotifListAsync({toUser, notifList}) {
  const pUserEmail = FBUtil.getDataAsync(['special', 'userEmail', toUser]); 
  const pUnsubscribed = FBUtil.getDataAsync(['userPrivate', toUser, 'unsubscribed'], false);
  const unSubKey = await FBUtil.getDataAsync(['userPrivate', toUser, 'unSubKey'], 0);
  const userEmail = await pUserEmail;
  const unsubscribed = await pUnsubscribed;

  if (unsubscribed) {
    return;
  }
  const unSubURL = 'https://talkwell.net/api/v1/unsubscribe?unSubUser=' + toUser + '&key=' + unSubKey;
  const htmlTemplate = FS.readFileSync('template/notiflist.html').toString();
  const textTemplate = FS.readFileSync('template/notiflist.text').toString();
  const templateData = {notifList, unSubURL};
  const htmlOutput = Mustache.render(htmlTemplate, templateData);
  const textOutput = Mustache.render(textTemplate, templateData);    
  // const count = notifList.length;

  const fromNames = getFromNamesForNotifs(notifList);
  const sepNames = _.join(commaSepStrings(fromNames),'');

  const email = {
    To: userEmail,
    From: 'TalkWell Notifs <notifs@talkwell.net>',
    Subject: ((notifList.length == 1) ? 'Reply' : 'Replies') + ' from ' + sepNames,
    HtmlBody: htmlOutput,
    TextBody: textOutput
  };

  console.log('emailing notifs to ' + userEmail);

  // console.log('would send', email);
  Email.sendEmail(email);
}

const secondMillis = 1000;
const minuteMillis = 60*secondMillis;
const hourMillis = 60*minuteMillis;
// const notifDelay = 0;
// const notifDelay = 4 * hourMillis;
// const notifDelay = 5 * minuteMillis;
const notifDelay = hourMillis;

async function sendPendingNotifsAsync({userId}) {
  // console.log('sendPendingNotifs', userId);

  const pLastAction = FBUtil.getDataAsync(['userPrivate', userId, 'lastAction'], 0);
  const pLastBatchNotif = FBUtil.getDataAsync(['userPrivate', userId, 'lastBatchNotif'], 0);
  const pendingNotifs = await FBUtil.getDataAsync(['userPrivate', userId, 'pendingNotif']);
  const lastAction = await pLastAction;
  const lastBatchNotif = await pLastBatchNotif;

  const newNotifKeys = _.filter(_.keys(pendingNotifs), 
    n => pendingNotifs[n].time > _.max([lastAction, lastBatchNotif]));
  const sortedNotifKeys = _.sortBy(newNotifKeys, n => pendingNotifs[n].time);
  const sortedNotifs = _.map(sortedNotifKeys, n => pendingNotifs[n]);

  const firstNotifTime = _.get(sortedNotifs,[0,'time'],null);


  if (!lastAction || sortedNotifs.length == 0) {
    return;
  }

  const timeSinceFirstNotif = Date.now() - firstNotifTime;

  if (timeSinceFirstNotif < notifDelay) {
    console.log('oldest notif not old enough yet: ' + (timeSinceFirstNotif / minuteMillis) + ' minutes');
    return;
  }

  // if (userId == 'jPZCzGMrx7fRc2qkH4NG1lsis2x1') {
  //   console.log('John', pendingNotifs, lastAction + notifDelay, newNotifKeys, sortedNotifKeys);
  // }

  if (lastAction && sortedNotifs.length > 0) {
    await FBUtil.setDataAsync(['userPrivate', userId, 'lastBatchNotif'], Date.now());
    await sendEmailForNotifListAsync({toUser: userId, notifList: sortedNotifs})
  } else {
    // console.log('no pending notifs');
  }
}
exports.sendPendingNotifsAsync = sendPendingNotifsAsync;


async function sendNotifAsync({toUser, title, body, data}) {
  console.log('sendNotifAsync', toUser, title);
  const pCount = FBUtil.getDataAsync(['userPrivate', toUser, 'notifCount'], 0);
  const pName = FBUtil.getDataAsync(['userPrivate', toUser, 'name'], null);
  const pToken = FBUtil.getDataAsync(['userPrivate', toUser, 'notifToken'], null);
  const pWebToken = FBUtil.getDataAsync(['userPrivate', toUser, 'webNotifToken'], null);
  const count = await pCount || 0;
  const token = await pToken;
  const webToken = await pWebToken;
  const name = await pName;

  if (_.get(data,'from','') == toUser) {
    console.log('skipping notif to self', toUser, name);
    return null;
  }

  const key = FBUtil.newKey();
  var pNotif; var pWebNotif;
  if (token || webToken) {
    if (token) {
      pNotif = sendNotifForTokenAsync({name, token, title, body, data: {...data, key}, badgeCount: count + 1});
    }
    if (webToken) {
      pWebNotif = sendWebNotifForTokenAsync({webToken, title, body});
    }
  } else if (!data.noEmail) {
    console.log('no notif token:', toUser, name);
    pNotif = FBUtil.setDataAsync(['userPrivate', toUser, 'pendingNotif', key], {toUser, title, body, data, time: Date.now()});
    // pNotif = sendEmailForNotifAsync({toUser, title, body, data});
  }
  const pData = FBUtil.setDataAsync(['userPrivate', toUser, 'notif', key], data);
  const pLast = FBUtil.setDataAsync(['userPrivate', toUser, 'lastNotif'], data);
  const pCountSet = FBUtil.setDataAsync(['userPrivate', toUser, 'notifCount'], count + 1);
  await pNotif;
  await pWebNotif;
  await pData;
  await pCountSet;
  await pLast;
}

// TODO: Do this the correct efficient way

async function sendBatchNotifs(notifs) {
  console.log('sendBatchNotifs', notifs.length);
  const pNotifs = _.map(notifs, notif => sendNotifAsync(notif));
  
  await Promise.all(pNotifs);
  // console.log('DONE notifs');
}

exports.sendBatchNotifs = sendBatchNotifs;


// const secondMillis = 1000;
// const minuteMillis = 60*secondMillis;

// async function getIsUserWebActive({meeting, user}) {
//   const pWebActive = FBUtil.fetchSingle('private/' + user + '/mymeeting/' + meeting + '/webActiveTime');
//   const pPresent = FBUtil.fetchSingle('meeting/' + meeting + '/webPresent/' + user);
//   const webActive = await pWebActive; const present = await pPresent;

//   const fiveMinutesAgo = Date.now() - (5 * minuteMillis);
//   const minuteAgo = Date.now() - minuteMillis;

//   return (webActive > fiveMinutesAgo) && (present > minuteAgo);
// }

// async function sendNotifIfNotWebActive({meeting, toUser, title, body, data, badgeCount, silent}) {
//   const active = await getIsUserWebActive({user: toUser, meeting});
//   if (!active) {
//     console.log('sending notif', toUser, title);
//     await sendNotif({toUser, title, body, data, badgeCount, silent});
//   } else {
//     console.log('user is web active - skipping', toUser, meeting);
//   }
// }
// exports.sendNotifIfNotWebActive = sendNotifIfNotWebActive;

// function sendNotifChunks(chunks) {
//   const head = chunks[0];
//   const tail = chunks.slice(1);
//   console.log('sending notif chunk: ', head);
//   return expo.sendPushNotificationsAsync(head).then(ticketChunk => {
//     console.log('tickets received: ', ticketChunk);
//     if (tail && tail.length > 0) {
//       return sendNotifChunks(tail);
//     } else {
//       return Promise.resolve(null);
//     }
//   })
// }

// async function sendBatchNotifsAsync({notifs}){
//   const requests = _.values(notifs);
//   console.log('sendBatchNotifs', notifs);
//   const userTokens = await FBUtil.getDataAsync(['userPrivate', toUser, 'notifToken'], null);

//   return FBUtil.fetchParallel({
//     pushTokens: '/special/userToNotifToken/',
//     pending: '/special/notifPending'
//   }).then(({pushTokens, pending}) => {
//     const hasPushEnabled = requests.filter(r => 
//       pushTokens[r.toUser] && Expo.isExpoPushToken(pushTokens[r.toUser])
//     );

//     const messages = hasPushEnabled.map(r => ({
//       to: pushTokens[r.toUser],
//       sound: 'default',
//       badge: _.values(pending[r.toUser]).filter(v=>v).length,
//       title: r.title, body: r.body, data: r.data || {}
//     }));

//     const chunks = expo.chunkPushNotifications(messages);
//     console.log('chunks', chunks);
//     if (chunks.length > 0) {
//       return sendNotifChunks(chunks);
//     }
//   })
// }

// async function sendTestNotif() {
//   return sendNotifAsync({
//     toUser: 'djRlZYlP8GhPrCWRUSbdSPbTFas1', fromUser: 'djRlZYlP8GhPrCWRUSbdSPbTFas1',
//     title: 'Test Notif', body: 'This is a test notif',
//     data: {},    
//   });
// }

exports.sendNotifAsync = sendNotifAsync
// exports.sendBatchNotifs = sendBatchNotifs
// exports.sendTestNotif = sendTestNotif
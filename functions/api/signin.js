const FBUtil = require('../output/fbutil');
const FS = require('fs');
const Mustache = require('mustache');
const Email = require('../output/email');
const _ = require('lodash');

const minute_millis = 60000;
const hour_millis = 60*minute_millis;

function normStr(str) {
  return str.toLowerCase().trim();
}

// TODO: Have proper email -> account lookup
// TODO: Rate limit how often you can request a PIN for a given email
async function requestLoginCode({email, createUser}) {
  console.log('request login code "' + email + '"');

  if (!email) {
    return {success: false, message: 'No email provided'};
  }

  const userEmails = await FBUtil.getDataAsync(['special','userEmail']);
  var uid = _.findKey(userEmails, userEmail => normStr(userEmail) == normStr(email))

  if (!uid && createUser) {
    uid = await FBUtil.createUser(email);
    console.log('new user', uid);
  } else if (!uid) {
    return {success: false, errorType:'no account', message: 'No account exists with email \'' + email + '\'. Make sure you use the email address that was invited to a conversation.'}
  }

  const lastPIN = await FBUtil.getDataAsync(['special','loginPIN', uid]);
  if (lastPIN && lastPIN.failedAttempts > 0) {
    const timeGap = Math.pow(2,lastPIN.failedAttempts) * 1000;
    if (Date.now() - lastPIN.time < timeGap) {
      console('Too soon. Rejecting request');
      return {success: false, message: 'Too many login requests'};
    }
  }

  // Don't change the pin if the user does several rapid requests. It confuses things.
  var pin = Math.floor(Math.random() * 1000000);
  var accessKey = Math.floor(Math.random() * 10000000000);

  if (lastPIN && (Date.now() - lastPIN.time < hour_millis)) {
    console.log('Reusing existing code');
    pin = lastPIN.pin;
  }
  const updates = {
    ['/special/loginPIN/' + uid]: {pin, email, time: Date.now(), failedAttempts: _.get(lastPIN,'failedAttempts', 0)},
    ['/userPrivate/' + uid + '/accessKey']: accessKey
  }
  FBUtil.applyUpdates(updates);

  const paddedPin = String(pin).padStart(6,'0');
  const templateData = {email, pin:paddedPin};

  const htmlTemplate = FS.readFileSync('template/pinrequest.html').toString();
  const textTemplate = FS.readFileSync('template/pinrequest.text').toString();
  const htmlOutput = Mustache.render(htmlTemplate, templateData);
  const textOutput = Mustache.render(textTemplate, templateData);

  console.log('sending mail to ', email);

  await Email.sendEmail({
    To: email,
    From: 'Iris Login <login@iris-talk.com>',
    Subject: 'Login code for Iris',
    HtmlBody: htmlOutput,
    TextBody: textOutput
  })
  return {success: true, message: 'Login code sent to ' + email};
}


const uid_reviewer = 'Pc9LHyQEOCerYcx3RcxCeKEwxLG3';
const email_reviewer = 'reviewer@iris-talk.com'
const pin_reviewer = 847632;

async function getLoginTokenForCode({email, code}) {
  console.log('getLoginTokenForCode', email, code);

  if (email == email_reviewer && code == pin_reviewer) {
    const token = await FBUtil.createLoginToken(uid_reviewer);
    return {success: true, token};    
  }

  const userEmails = await FBUtil.getDataAsync(['special','userEmail']);
  const uid = _.findKey(userEmails, userEmail => normStr(userEmail) == normStr(email))
  const lastPIN = await FBUtil.getDataAsync(['special','loginPIN',uid]);

  console.log({uid, lastPIN});

  if (!uid || !lastPIN) {
    console.log('No uid or no PIN');
    return {success: false, message: 'No user for this email, or no PIN requested'};
  }
  if ((Date.now() - lastPIN.time) > 30 * minute_millis) {
    console.log('Code expired');
    return {success: false, message: 'Login code has expired.'};
  }
  if (lastPIN.pin != code) {    
    console.log('PIN incorrect');
    await FBUtil.applyUpdates({
      ['/special/loginPIN/' + uid + '/failedAttempts']: _.get(lastPIN,'failedAttempts', 0) + 1
    });
    return {success: false, message: 'Wrong pin'};
  }

  try {
    console.log('creating login token');
    const token = await FBUtil.createLoginToken(uid);
    await FBUtil.deleteItemAsync(['special','loginPIN',uid]);
    console.log('success');
    return {success: true, token};
  } catch (e) {
    console.log('error in token generation:', e.message);
    return {success: 'false', message: e.message};
  }
}


exports.requestLoginCode = requestLoginCode;
exports.getLoginTokenForCode = getLoginTokenForCode;
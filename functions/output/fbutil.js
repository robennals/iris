const admin = require('firebase-admin');
const _ = require('lodash');

async function getDataAsync(path, fallback = {}) {
    const pathString = _.join(path,'/');
    const ref = admin.database().ref(pathString);
    const snap = await ref.once('value');
    return snap.val() || fallback;
}
exports.getDataAsync = getDataAsync;

async function getMultiDataAsync(keys, pathFunc, fallback) {
	const promises = _.map(keys, k => getDataAsync(pathFunc(k), fallback));
	const values = await Promise.all(promises);
	return _.zipObject(keys, values);
}
exports.getMultiDataAsync = getMultiDataAsync;

async function setDataAsync(path, value) {
	const pathString = _.join(path,'/');
    const ref = admin.database().ref(pathString);
	await ref.set(value);
}
exports.setDataAsync = setDataAsync;


async function deleteItemAsync(path) {
    const pathString = _.join(path,'/');
    const ref = admin.database().ref(pathString);
    await ref.set(null);
}
exports.deleteItemAsync = deleteItemAsync;


function applyUpdates(updates, message) {
	return admin.database().ref().update(updates);
}
exports.applyUpdates = applyUpdates;

function emailAsKey(email) {
    return email.replace(/\./g, '%2E');
  }
exports.emailAsKey = emailAsKey;

function normStr(str) {
	return str.toLowerCase().trim();
}

async function createUser(email) {
	const userRecord = await admin.auth().createUser({
		email: normStr(email)
	});
	const uid = userRecord.uid;
	const key = emailAsKey(email);
	const unSubKey = Math.floor(Math.random() * 10000000000);

	await applyUpdates({
		['/special/userEmail/' + uid]: normStr(email),
		['/special/emailUser/' + key]: uid,
		['/userPrivate/' + uid + '/unSubKey']: unSubKey
	});
	return uid;
}
exports.createUser = createUser;

async function getOrCreateUserAsync(email) {
	const userEmails = await getDataAsync(['special','userEmail']);
	var uid = _.findKey(userEmails, userEmail => userEmail == email)
	var created = false;
  
	if (!uid && createUser) {
	  uid = await createUser(email);
	  created = true;
	}
	return {uid, created};
}
exports.getOrCreateUserAsync = getOrCreateUserAsync;

function createLoginToken(uid) {
	return admin.auth().createCustomToken(uid);
}
exports.createLoginToken = createLoginToken;

function newKey(){
	return admin.database().ref().push().key;	
}
exports.newKey = newKey;

async function uploadFile({filename, buffer, contentType}) {
	const bucket = admin.storage().bucket();
	const file = bucket.file(filename);
	await file.save(buffer, {metadata: {contentType}});
}
exports.uploadFile = uploadFile;

async function uploadBase64Image({base64data, isThumb = false, userId, key}) {
	const section = isThumb ? 'thumb' : 'image';
	const filename = section + '/' + userId + '/' + key + '.jpeg';
	const buffer = new Buffer(base64data, 'base64');  
  
	await uploadFile({filename, buffer, contentType:'image/jpeg'});
	return true;
}
exports.uploadBase64Image = uploadBase64Image;

async function sendFBMessageAsync(token,message) {
	console.log('sendFBMessage', token, )
	admin.messaging().sendToDevice(token, message);
}
exports.sendFBMessageAsync = sendFBMessageAsync;

import {firebaseApp, masterUsers } from "./config";
import { getAuth, onAuthStateChanged, signInWithCustomToken, signOut } from "firebase/auth";
import { getDatabase, ref, onValue, off, update, get, set, once, serverTimestamp, push } from "firebase/database";
import _ from 'lodash';

const database = getDatabase();

export function newKey() {
	return push(ref(database)).key;
}

var global_currentUser = null;
var global_firebaseUser = null;

const auth = getAuth();

export function getCurrentUser() {
    return global_currentUser;
}

export function isMasterUser() {
    const me = getCurrentUser();
    for (var i = 0; i < masterUsers.length; i++) {
        if (masterUsers[i] == me) {
            return true;
        }
    }
    return false;
}

export function getUser() {
    return global_currentUser;
}

var global_authCallbacks = [];


export function onFirebaseAuthStatechanged(callback) {
    global_authCallbacks.push(callback);
    return onAuthStateChanged(auth, callback);
}

onAuthStateChanged(auth, fbUser => {
    global_currentUser = _.get(fbUser,'uid');
    global_firebaseUser = _.get(fbUser,'uid');
})


export function callAuthStateChangedCallbacks(user) {
    global_currentUser = null;
    global_authCallbacks.forEach(callback =>
        callback(user)
    )
}

export async function signInWithTokenAsync(token){
    await signInWithCustomToken(auth, token);
}

export function firebaseSignOut() {
	return signOut(auth);
}

export async function maybeFirebaseSignOut() {
    if (global_firebaseUser) {
        signOut(auth);
        global_firebaseUser = null;
    }
}

function refForPath(path) {
    return ref(database, _.join(path, '/'));
}

export async function updateDataAsync(path, updates){ 
    const ref = refForPath(path);
    await update(ref, updates);
}

export async function setDataAsync(path, value) {
    const ref = refForPath(path);
    await set(ref, value);
}

export async function getDataAsync(path) {
    // console.log('getDataAsync', path);
    const ref = refForPath(path);
    const result = await get(ref);
    const value = result.val();
    // console.log('result', value);
    return value;
}


export function watchData(obj, path, callback, fallback = {}) {
	try {
		if (typeof(callback) != 'function') {
			console.error('bad watch', {obj, path, callback, cbtype: typeof(callback)});
			throw new Error('bad watch');
		}

		const watchFunc = snap => {
			callback(snap.val() || fallback);
		}
		const ref = refForPath(path)

        if (obj) {
            if (!obj.watchers) {obj.watchers = []}
            obj.watchers.push({ref, watchFunc});
        }

		return onValue(ref, watchFunc, error => {
            console.error(error); 
            throw new Error(error)}
        );
	} catch (e) {
		console.error('error in watch:', path);
		console.log(e);
	}
    return null;
}

export function internalReleaseWatchers(obj) {
	if (obj && obj.watchers) {
		obj.watchers.forEach(({ref, watchFunc}) => {
			off(ref, 'value', watchFunc);
		})
	}
}

export function releaseWatcher(path, func) {
    const ref = refForPath(path);
    off(ref, 'value', func);
}

export function getFirebaseServerTimestamp(){
    return serverTimestamp();    
} 
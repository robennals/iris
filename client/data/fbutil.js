import {firebaseApp } from "./config";
import { getAuth, onAuthStateChanged, signInWithCustomToken, signOut } from "firebase/auth";
import { getDatabase, ref, onValue, off, update, get, set, once } from "firebase/database";
import _ from 'lodash';

const database = getDatabase();

export function newKey() {
	return ref(database).push().key;
}

var global_currentUser = null;

const auth = getAuth();

onAuthStateChanged(auth, fbUser => {
    global_currentUser = _.get(fbUser,'uid');
})

export function getCurrentUser() {
    return global_currentUser;
}

export function getUser() {
    return global_currentUser;
}

export function onFirebaseAuthStatechanged(callback) {
    return onAuthStateChanged(auth, callback);
}

export async function signInWithTokenAsync(token){
    await signInWithCustomToken(auth, token);
}

export function firebaseSignOut() {
	return signOut(auth);
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

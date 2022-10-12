import React, {useEffect, useState} from 'react';
import {firebaseApp, masterUsers } from "./config";
import { getAuth, onAuthStateChanged, signInWithCustomToken, signOut } from "firebase/auth";
import { getDatabase, ref, onValue, off, update, get, set, serverTimestamp, push, onChildAdded, onChildChanged, onChildRemoved, remove } from "firebase/database";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import _ from 'lodash';
import { Platform } from "react-native";
import { captureException } from "../components/shim";
import { NetworkContext } from "../components/context";

var messaging = null;
var global_messaging_supported = null;

async function fbStartup() {
    const supported = await isSupported();
    global_messaging_supported = supported;
    console.log('messaging supported ', supported);
    if (Platform.OS == 'web' && supported) {
        messaging = getMessaging(firebaseApp);
        onMessage(messaging, (payload) => {
            console.log('Foreground message received. ', payload);
            // ...
        });
    }
}
fbStartup();

export async function getFirebaseNotifTokenAsync() {
    if (messaging) {
        return await getToken(messaging, {vapidKey: 'BCbOd7O4PQnzInDEJJQDJJYv9hU44ua5nYr7cfsh3M3FdlNvcbqPceLP-aJ-lCcXDwsnnizRHxNmn4NObYolS80'});
    } else {
        return null;
    }
}

export function getFirebaseNotifsSupported() {
    return global_messaging_supported;
}

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

var global_requested_signout = false;
export async function requestDelayedSignout() {
    global_requested_signout = true;
}

export async function maybeFirebaseSignOut() {
    if (global_firebaseUser && global_requested_signout) {
        console.log('-- Doing Delayed Sign Out --')
        signOut(auth);
        global_firebaseUser = null;
        global_requested_signout = false;
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
            // throw new Error(error)}
        });
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

export function OLD_useListDatabase(dependencies, path) {
    const [items, setItems] = useState(null);
    useEffect(() => {
        const hasNullDependencies = _.filter(dependencies, x => x == null).length > 0;
        if (!hasNullDependencies) {
            try {
                const ref = refForPath(path);
                const addFunc = data => {
                    setItems({...items || {}, [data.key]: data.val()})
                }
                const changeFunc = data => {
                    setItems({...items || {}, [data.key]: data.val()});
                }
                const removeFunc = data => {
                    setItems({...items || {}, [data.key]: null})
                }
                onChildAdded(ref, addFunc);
                onChildChanged(ref, changeFunc);
                onChildRemoved(ref, removeFunc);
                return () => {
                    off(ref, addFunc);
                    off(ref, changeFunc);
                    off(ref, removeFunc);
                }
            } catch (e) {
                captureException(e);
            }
        }
    }, dependencies);
    return items;
}

var global_pathData = {};

function onListValue(ref, watchFunc, checkLoaded) {
    const key = Math.floor(Math.random() * 1000)
    // console.log('add watchers', key);
    const addFunc = data => {
        if (!checkLoaded()) return;
        watchFunc(data.key, data.val(), true);
    }
    const changeFunc = data => {
        if (!checkLoaded()) return;
        // console.log('change', key);
        watchFunc(data.key, data.val(), false);
    }
    const removeFunc = data => {
        if (!checkLoaded()) return;
        watchFunc(data.key(), null, false);
    }

    const offAdd = onChildAdded(ref, addFunc);
    const offChange = onChildChanged(ref, changeFunc);
    const offRemove = onChildRemoved(ref, removeFunc);

    return {ref, offAdd, offChange, offRemove, key};
}

function offListValue({ref, offAdd, offChange, offRemove, key}) {
    // console.log('offListValue', {key, ref, addFunc, changeFunc, removeFunc});
    // console.log('offListValue', key);
    try {
        offAdd();
        offChange();
        offRemove();
    } catch (e) {
        console.error('off failed', e);
    }
}

export function useListDatabase(dependencies, path) {
    const [value, setValue] = useState(null);
    var loaded = false;
    const p = _.join(path, '/');
    useEffect(() => {
        const hasNullDependencies = _.filter(dependencies, x => x == null).length > 0;
        if (!hasNullDependencies) {
            try {                
                const ref = refForPath(path);
                const initFunc = snap => {
                    const data = snap.val();
                    global_pathData[p] = data || {};
                    setValue(data);
                    // console.log('loaded initial data', p, data);
                    loaded = true;
                }
                onValue(ref, initFunc, {onlyOnce: true});
                const checkLoaded = () => loaded;
                const watchFunc = (key, value, isAdd) => {
                    if (!loaded) {
                        return;
                    } else if (isAdd && global_pathData[p][key]) {
                        // console.log('Add event for known item', key);
                        return;
                    } else {
                        const data = {...global_pathData[p], [key]: value};
                        global_pathData[p] = data; 
                        setValue(data);
                        // console.log('updated item', key, value, isAdd);
                    }
                }
                const offKey = onListValue(ref, watchFunc, checkLoaded);
        
                return () => {
                    console.log('detach', p);
                    offListValue(offKey)
                    off(ref, initFunc);
                };
            } catch (e) {
                captureException(e);
            }
        }
    }, dependencies)
    return value;
}


export function useDatabase(dependencies, path, fallback = {}, init = null) {
    const [value, setValue] = useState(init);
    useEffect(() => {
        const hasNullDependencies = _.filter(dependencies, x => x == null).length > 0;
        if (!hasNullDependencies) {
            try {
                const ref = refForPath(path);
                const watchFunc = snap => {
                    setValue(snap.val() || fallback);
                }
                onValue(ref, watchFunc, error => {
                    console.error(error); 
                    captureException(error);
                });
        
                return () => off(ref, watchFunc);
            } catch (e) {
                captureException(e);
            }
        }
    }, dependencies)
    return value;
}

export function releaseWatcher(path, func) {
    const ref = refForPath(path);
    off(ref, 'value', func);
}

export function getFirebaseServerTimestamp(){
    return serverTimestamp();    
} 

export function NetworkStateProvider({children}) {
    const [connected, setConnected] = useState(true);
    const [waited, setWaited] = useState(false);
    useEffect(() => {
        var timeout = null;
        var x = {};
        watchData(x, ['.info', 'connected'], connected => {
            setConnected(connected);
            setWaited(false);
            if (timeout) {
                clearTimeout(timeout);
            }
            if (!connected) {
                console.log('setting timeout');
                timeout = setTimeout(() => setWaited(true), 5000);
            }
        }, false);        
        return () => {
            internalReleaseWatchers(x);
            clearTimeout(timeout);
        }
    }, []); 
    return (
        <NetworkContext.Provider value={{connected, waited}}>
            {children}
        </NetworkContext.Provider>
    )
}
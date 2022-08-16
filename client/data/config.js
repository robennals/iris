import {initializeApp} from 'firebase/app';
import 'firebase/auth';
import 'firebase/database';
import 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAP2I_E2zv8ab3t6uscHPcXr2UTGIPbbHU",
  authDomain: "iris-talk.firebaseapp.com",
  databaseURL: "https://iris-talk-default-rtdb.firebaseio.com",
  projectId: "iris-talk",
  storageBucket: "iris-talk.appspot.com",
  messagingSenderId: "859886276868",
  appId: "1:859886276868:web:7ac842c9e4a552bbc28051"
};

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig);

export const appName = 'Mix5'
export const appSlogan = 'Get good conversations started!'
// export const appSlogan = 'People-Centered Groups'
export const missingPersonName = 'No Longer in Group'

export const appIcon = 'https://communitalk.org/logo.png'
export const appDomain = 'https://communitalk.org'
export const localWebDomain = 'http://localhost:5000';

export const baseColor = '#0084ff';
export const baseBackgroundColor = '#fff'
export const highlightColor = '#ffffdd'
// export const baseBackgroundColor = '#f5f5f5';

export const minTwoPanelWidth = 900

export const version = 23


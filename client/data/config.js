import {initializeApp} from 'firebase/app';
import 'firebase/auth';
import 'firebase/database';
import 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDw3bA7TxCtVNnIoKvIrzXFAK9ugj0Ia9w",
  authDomain: "talkwell.firebaseapp.com",
  databaseURL: "https://talkwell-default-rtdb.firebaseio.com",
  projectId: "talkwell",
  storageBucket: "talkwell.appspot.com",
  messagingSenderId: "925533439545",
  appId: "1:925533439545:web:d8dbb6204d39ea9129afe8"
};

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig);

export const appName = 'TalkWell'
export const appSlogan = 'Easy to Join. Hard to Disrupt'
// export const appSlogan = 'People-Centered Groups'
export const missingPersonName = 'No Longer in Group'

export const appIcon = 'https://talkwell.net/talkwell_icon.png'
export const appDomain = 'https://talkwell.net'
export const localWebDomain = 'http://localhost:5000';

export const baseColor = '#0084ff';
export const baseBackgroundColor = '#fff'
export const highlightColor = '#ffffdd'
// export const baseBackgroundColor = '#f5f5f5';

export const minTwoPanelWidth = 900

export const version = 23


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

export const appName = 'Iris'
export const appSlogan = 'Get good conversations started!'
// export const appSlogan = 'People-Centered Groups'
export const missingPersonName = 'No Longer in Group'

export const appIcon = 'https://iris-talk.com/logo.png'
export const appDomain = 'https://iris-talk.com'
export const localWebDomain = 'http://localhost:5000';

export const baseColor = '#0084ff';
export const baseBackgroundColor = '#fff'
export const highlightColor = '#ffffdd'
// export const baseBackgroundColor = '#f5f5f5';

export const minTwoPanelWidth = 700

export const version = 39

export const experienceId = '@robennals/iris-talk';

export const masterUsers = ['msxTO8YflDYNgmixbmC5WbYGihU2', 'N8D5FfWwTxaJK65p8wkq9rJbPCB3', '8Nkk25o9o6bipF81nvGgGE59cXG2'];

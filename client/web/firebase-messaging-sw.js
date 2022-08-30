importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

const firebaseConfig = {
    apiKey: "AIzaSyAP2I_E2zv8ab3t6uscHPcXr2UTGIPbbHU",
    authDomain: "iris-talk.firebaseapp.com",
    databaseURL: "https://iris-talk-default-rtdb.firebaseio.com",
    projectId: "iris-talk",
    storageBucket: "iris-talk.appspot.com",
    messagingSenderId: "859886276868",
    appId: "1:859886276868:web:7ac842c9e4a552bbc28051"
  };  


firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

console.log('messaging', messaging);



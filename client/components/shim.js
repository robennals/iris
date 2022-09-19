import React from 'react';
import {View, FlatList, Text, TouchableOpacity, StyleSheet} from 'react-native';
import { appDomain } from "../data/config";
import * as ImageManipulator from 'expo-image-manipulator';
import { useNavigation } from "@react-navigation/core";
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as Sentry from 'sentry-expo';

import _ from 'lodash';
import {ExpoMixpanelAnalytics} from './expomixpanel';
const mixpanel = new ExpoMixpanelAnalytics('c9edc36b0c9edd86c4fa8a64aa9818d1');


export function track(eventName, params) {
  mixpanel.track(eventName, params);
}

export function identify(userId) {
  mixpanel.identify(userId);
}

export function resetMixpanel() {
  mixpanel.reset();
}

export function getCurrentDomain(){ 
    return appDomain
}

export function webInit() {}

export async function resizeImageAsync({uri, pickedImage, rotate=false, maxSize = 400}) {
    const {width, height} = pickedImage;
    var newHeight; var newWidth;
    if (width > height) {
      newHeight = maxSize; 
      newWidth = Math.floor((width / height) * maxSize);
    } else {
      newWidth = maxSize;
      newHeight = Math.floor((height / width) * maxSize);
    }
  
    const result = await ImageManipulator.manipulateAsync(uri, [
        {resize: {width: newWidth, height: newHeight}}
      ],
      {format: 'jpeg', compress: 0.9, base64: true}
    );
    // const dataUrl = makeDataUrl({contentType: 'image/jpeg', base64data: result.base64})
    // return dataUrl;
    return result.base64;
}

export function getTimeNow() {
    return Date.now()
}

export function historyPushState({state, url}) {}

export function useCustomNavigation() {
  return useNavigation();
}



export function TitleBlinker() {return null};
export function setTitle() {};
export function addFocusListener() {};
export function removeFocusListener() {};


export function vibrate(){
  Haptics.selectionAsync();
}


export async function requestNotifPermission() {
  const notifStatus = await Notifications.requestPermissionsAsync();
  if (_.get(notifStatus, 'status') == 'granted') {
    return true;
  } else {
    return false;
  }
}

export async function checkIfNotifsGranted() {
  const notifStatus = await Notifications.getPermissionsAsync();
  return (_.get(notifStatus, 'status') == 'granted');
}

export async function getNotifToken() {
  return (await Notifications.getExpoPushTokenAsync()).data;
}

export function captureException(e) {
  return Sentry.Native.captureException(e);
}

export function setContext(dict) {
  return Sentry.Native.setContext(dict);
}


export const ErrorBoundary = Sentry.Native.ErrorBoundary;


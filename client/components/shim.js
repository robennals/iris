import React from 'react';
import {View, FlatList, Text, TouchableOpacity, StyleSheet, Platform} from 'react-native';
import { appDomain, experienceId } from "../data/config";
import * as ImageManipulator from 'expo-image-manipulator';
import { useNavigation } from "@react-navigation/core";
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as Sentry from 'sentry-expo';

import _ from 'lodash';
import {ExpoMixpanelAnalytics} from './expomixpanel';
const mixpanel = new ExpoMixpanelAnalytics('c9edc36b0c9edd86c4fa8a64aa9818d1');

// TODO: Get this working on Android, and work out what issues are.
export function track(eventName, params) {
  if (Platform.OS == 'android') return;
  mixpanel.track(eventName, params);
}

export function identify(userId) {
  if (Platform.OS == 'android') return;
  mixpanel.identify(userId);
}

export function people_set(props) {
  if (Platform.OS == 'android') return;
  mixpanel.people_set(props);
}

export function resetMixpanel() {
  mixpanel.reset();
}

export function getCurrentDomain(){ 
    return appDomain
}

export function webInit() {}

export async function resizeImageAsync({uri, bigPhoto, rotate=false, maxSize = 400}) {
    const {width, height} = bigPhoto;
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



export function TitleBlinker() {return null}
export function setTitle() {}
export function addFocusListener() {}
export function removeFocusListener() {}


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
  return (await Notifications.getExpoPushTokenAsync({experienceId: experienceId})).data;
}

export function captureException(e) {
  return Sentry.Native.captureException(e);
}

export function setContext(dict) {
  return Sentry.Native.setContext(dict);
}


export const ErrorBoundary = Sentry.Native.ErrorBoundary;

export function notifsSupported() {
  return true;
}

export async function playAlertSound() {
  return null;
}

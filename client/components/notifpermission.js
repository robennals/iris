import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import React, { useState, useEffect, useRef } from 'react';
import { Text, View, Button, Platform, StyleSheet } from 'react-native';
import { getCurrentUser, setDataAsync, getDataAsync, getFirebaseNotifTokenAsync, watchData, internalReleaseWatchers, getFirebaseServerTimestamp } from '../data/fbutil';
import _ from 'lodash'
import { FixedTouchable, MinorButton, WideButton } from './basics';
import { Ionicons } from '@expo/vector-icons';
import { checkIfNotifsGranted, getNotifToken, requestNotifPermission, track } from './shim';
import { serverTimestamp } from 'firebase/database';

// export async function checkIfNotifsGranted() {


//     if (Platform.OS == 'web') {
//       return Notification.permission == 'granted';
//     }  
//     const notifStatus = await Notifications.getPermissionsAsync();
//     // console.log('notifStatus', notifStatus);
//     if (_.get(notifStatus, 'status') != 'granted') {
//       return false;
//     } else { 
//       return true;
//     }   
// }

export async function refreshNotifToken() {
  console.log('refreshNotifToken');
  try {
    const tokenName = Platform.OS == 'web' ? 'webNotifToken' : 'notifToken';
    const oldToken = await getDataAsync(['userPrivate', getCurrentUser(), tokenName]);
    const newToken = await getNotifToken();
    console.log('token', {tokenName, oldToken, newToken});
    if (oldToken != newToken) {
      await setDataAsync(['userPrivate', getCurrentUser(), tokenName], newToken);
      console.log('wrote new');
    }
  } catch (e) {
    console.log('notif error', e);
  }

    // if (Platform.OS == 'web') {
    //   const notifToken = await getDataAsync(['userPrivate', getCurrentUser(), 'webNotifToken']);      
    //   const fbNotifToken = getFirebaseNotifTokenAsync();
    //   if (notifToken != fbNotifToken) {
    //     await setDataAsync(['userPrivate', getCurrentUser(), 'webNotifToken'], expoNotifToken);
    //   }
    // }
  
    // try {
    //   const notifToken = await getDataAsync(['userPrivate', getCurrentUser(), 'notifToken']);      
    //   const expoNotifToken = (await Notifications.getExpoPushTokenAsync()).data;
    //   if (notifToken != expoNotifToken) {
    //     await setDataAsync(['userPrivate', getCurrentUser(), 'notifToken'], expoNotifToken);
    //   }
    // } catch (e) {
    //   console.log('notif error', e);
    // }
}

export class EnableNotifsBanner extends React.Component {
    state = {notifsEnabled: true, denied: false, later: true}
    async componentDidMount() {
      watchData(this, ['userPrivate', getCurrentUser(), 'notifsLater'], later => this.setState({later}), false);

      const notifsEnabled = await checkIfNotifsGranted();
      if (notifsEnabled) {
        await refreshNotifToken();
      }
      this.setState({notifsEnabled: await checkIfNotifsGranted()});
    }

    async componentWillUnmount() {
      internalReleaseWatchers(this);
    }

    async onMaybeLater() {
      await setDataAsync(['userPrivate', getCurrentUser(), 'notifsLater'], getFirebaseServerTimestamp());
    }

    async setupNotifToken() {
      track('Enable Notifs Clicked');
      const permissionGranted = requestNotifPermission();
      // const notifStatus = await Notifications.requestPermissionsAsync();
      if (permissionGranted) {
        track('Notif Permission Granted');
        await refreshNotifToken();
        this.setState({notifsEnabled: true});
      } else {
        track('Notif Permission Denied');
        this.setState({denied: true});
      }
    }
  
    async pollForNotifsGranted() {
      const granted = await checkIfNotifsGranted();
      if (granted) {
        this.setState({notifsEnabled: true});
      } else if (!isTest) {
        setTimeout(() => this.pollForNotifsGranted(), 500);
      }
    }
  
    render() {
      const {alwaysAsk, style} = this.props;
      const {notifsEnabled, denied, later} = this.state;
      // console.log('notifsEnabled', notifsEnabled, denied);
      if (notifsEnabled) return null;
      // console.log('stuff', {alwaysAsk, later});
      if (!alwaysAsk && later) return null;
      return (
        <FixedTouchable onPress={()=>this.setupNotifToken()}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
              backgroundColor: '#F3F7C0', 
              borderBottomColor: '#ddd', borderBottomWidth: StyleSheet.hairlineWidth, 
              padding: 8, margin: 0, ...style}}>
            <Ionicons name='ios-notifications' size={30}/>
            <Text style={{marginHorizontal: 8, flex: 1}}>
              <Text style={{fontWeight: 'bold'}}>Enable notifications</Text> to know when you get a new message.
            </Text>
            {Platform.OS == 'web' && !alwaysAsk ?
              <MinorButton alwaysActive onPress={() => this.onMaybeLater()}>Not now</MinorButton>
            :null}
            {denied 
            ? <WideButton alwaysActive style={{margin: 0}} onPress={()=>{Linking.openURL('app-settings://'); this.pollForNotifsGranted()}}
                >Open Settings
              </WideButton>
            : <WideButton style={{margin: 0}} onPress={()=>this.setupNotifToken()} progressText='Enabling...'>Enable</WideButton>
            }
          </View>
        </FixedTouchable>
      )
    }
  }
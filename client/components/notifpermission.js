import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import React, { useState, useEffect, useRef } from 'react';
import { Text, View, Button, Platform, StyleSheet } from 'react-native';
import { getCurrentUser, setDataAsync, getDataAsync } from '../data/fbutil';
import _ from 'lodash'
import { FixedTouchable, WideButton } from './basics';
import { Ionicons } from '@expo/vector-icons';

export async function checkIfNotifsGranted() {
    if (Platform.OS == 'web') {
      return true;
    }  
    const notifStatus = await Notifications.getPermissionsAsync();
    // console.log('notifStatus', notifStatus);
    if (_.get(notifStatus, 'status') != 'granted') {
      return false;
    } else { 
      return true;
    }   
}

export async function refreshNotifToken() {
    if (Platform.OS == 'web') {
      return;
    }
  
    try {
      const notifToken = await getDataAsync(['userPrivate', getCurrentUser(), 'notifToken']);      
      const expoNotifToken = (await Notifications.getExpoPushTokenAsync()).data;
      if (notifToken != expoNotifToken) {
        await setDataAsync(['userPrivate', getCurrentUser(), 'notifToken'], expoNotifToken);
      }
    } catch (e) {
      console.log('notif error', e);
    }
  }

export class EnableNotifsBanner extends React.Component {
    state = {notifsEnabled: true, denied: false}
    async componentDidMount() {
      const notifsEnabled = await checkIfNotifsGranted();
      if (notifsEnabled) {
        await refreshNotifToken();
      }
      this.setState({notifsEnabled: await checkIfNotifsGranted()});
    }
  
    async setupNotifToken() {
      const notifStatus = await await Notifications.requestPermissionsAsync();
      if (_.get(notifStatus, 'status') == 'granted') {
        await refreshNotifToken();
        this.setState({notifsEnabled: true});
      } else {
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
      const {notifsEnabled, denied} = this.state;
      if (notifsEnabled) return null;
      return (
        <FixedTouchable onPress={()=>this.setupNotifToken()}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
              backgroundColor: '#F3F7C0', 
              borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth, 
              padding: 8, margin: 0}}>
            <Ionicons name='ios-notifications' size={30}/>
            <Text style={{marginHorizontal: 8, flex: 1}}>
              <Text style={{fontWeight: 'bold'}}>Enable notifications</Text> to know when you get a new message.
            </Text>
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
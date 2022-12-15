import React, {useContext} from 'react';
import { findDOMNode } from 'react-dom';
import { ScrollView, View, Text, FlatList} from 'react-native';
import { appDomain, appName, localWebDomain } from "../data/config";
import { FixedTouchable, HoverView, parsePhotoDataUri } from "./basics";
import { Catcher } from './catcher';
import {Audio} from 'expo-av';
import { Entypo } from '@expo/vector-icons';
import { querystringDecode } from '@firebase/util';
import { getFirebaseNotifTokenAsync } from '../data/fbutil';
// import mixpanel from 'mixpanel-browser';
import {ExpoMixpanelAnalytics} from './expomixpanel';
import _ from 'lodash';


/* eslint-disable react/no-find-dom-node */


export function popupConfirm({title, text, onConfirm}) {
  if (confirm(title + '\n' + text) == true) {
    onConfirm();
  } else {
    console.log('Cancel pressed');
  }
}


export function ModalMenu() {return null}


function findCurrentLabel(items, id) {
    const item = _.find(items, i => i.id == id);
    return _.get(item,'label', '');
  }
  
  
  export function PopupSelector({value, items, style, onSelect, color='black'}) {
    return (
      <View style={{marginHorizontal: 16, marginVertical: 4}}>
        <select value={value} onChange={e => onSelect(e.target.value)} style={{
            backgroundColor: 'white', padding: 8, borderColor: '#ddd', borderWidth: 1, 
            WebkitAppearance: 'none', borderRadius: 8, flex: 1, color}}>
              {items.map(item => 
                <option key={item.id} value={item.id}>{item.label}</option>
              )}
        </select>
      </View>
    )
  }

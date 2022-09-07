import React from 'react';
import {View, FlatList, Text, TouchableOpacity, StyleSheet} from 'react-native';
import { appDomain } from "../data/config";
import * as ImageManipulator from 'expo-image-manipulator';
import { useNavigation } from "@react-navigation/core";
import { Catcher } from './catcher';
import Modal from 'react-native-modal';
import { FixedTouchable } from './basics';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import _ from 'lodash';
import { ScrollView } from 'react-native-gesture-handler';


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

function basicRenderItem ({item: {key, item, value}}) {
  return <Catcher>{item || value()}</Catcher>;
}

export class BottomFlatScroller extends React.Component {
  state = {}
  safariScrollToEnd() {}
  render() {
    const {data, style} = this.props;
    const {height} = this.state;    
    return (
      <View style={{flex: 1, justifyContent: 'flex-start', flexDirection: 'column'}}>
        <FlatList inverted initialNumToRender={20}
          style={{flex: 1, /* maxHeight: height */}}
          keyboardDismissMode='on-drag'
          // estimatedItemSize={78}
          data={data.slice().reverse()}
          renderItem={basicRenderItem}
          onContentSizeChange={(width, height) => this.setState({height})}
        />
      </View>
    )
  }
}

export function TitleBlinker() {return null};
export function setTitle() {};
export function addFocusListener() {};
export function removeFocusListener() {};


export function ModalMenu({items, onSelect, onClose}) {
  return (
    <Modal style={{justifyContent: 'flex-end'}} 
        isVisible onBackdropPress={onClose} >
      <FixedTouchable onPress={onClose} style={{flex: 1}}>
        <BottomFlatScroller data={items.map(i => 
          ({key: i.id, item: 
            <FixedTouchable key={i.id} onPress={() => {
              onSelect(i.id)
            }}>
              <View style={{backgroundColor: '#fff', borderRadius: 16, padding: 8, alignItems: 'center', margin: 4}}>
                <Text style={{fontSize: 20}}>{i.label}</Text>
              </View>
            </FixedTouchable>
          })
        )} 
        />
        </FixedTouchable>
      {/* <ScrollView>        
        {items.map(i => 
          <FixedTouchable key={i.id} onPress={() => {
            onSelect(i.id);
            // onClose()
          }}>
            <View style={{backgroundColor: '#fff', borderRadius: 16, padding: 8, alignItems: 'center', margin: 4}}>
              <Text style={{fontSize: 20}}>{i.label}</Text>
            </View>
          </FixedTouchable>
        )}
      </ScrollView> */}
    </Modal>
  )
}

export function vibrate(){
  Haptics.selectionAsync();
}

function findCurrentLabel(items, id) {
  const item = _.find(items, i => i.id == id);
  return _.get(item,'label', '');
}

export class PopupSelector extends React.Component {
  state = {}
  render() {
    const {value, items, style, placeholder, onSelect, color} = this.props;
    const currentLabel = findCurrentLabel(items, value) || placeholder;
    return (
      <View style={{marginHorizontal: 16, marginVertical: 4}}>
        <PopupMenu items={items} onSelect={onSelect} >
          <View style={{borderColor: '#ddd', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, ...style}}>
            <Text style={{fontSize: 20, color: color || 'black'}}>
              {currentLabel}
            </Text>
          </View>
        </PopupMenu>
      </View>
    )
  }
}

export class PopupMenu extends React.Component {
  state = {shown: false}
  render() {
    const {children, items, onSelect} = this.props;
    const {shown} = this.state;
    return (
      <View>
        <TouchableOpacity onPress={() => this.setState({shown: true})}>
          {children}
        </TouchableOpacity>
        {shown ?  
          <ModalMenu items={items} onClose={()=>this.setState({shown: false})}
                onSelect={id => {onSelect(id); this.setState({shown: false})}} />
        : null }
      </View>
    )
  }
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


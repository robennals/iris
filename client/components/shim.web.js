import React from 'react';
import { useContext } from "react";
import { findDOMNode } from 'react-dom';
import { ScrollView, View, Text} from 'react-native';
import { appDomain, appName, localWebDomain } from "../data/config";
import { FixedTouchable, HoverView, parsePhotoDataUri } from "./basics";
import { Catcher } from './catcher';
import { AppContext } from "./context";
import {Audio} from 'expo-av';
import { Entypo } from '@expo/vector-icons';
import { querystringDecode } from '@firebase/util';
import { getFirebaseNotifTokenAsync } from '../data/fbutil';
import * as Sentry from 'sentry-expo';
import * as SentryBrowser from "@sentry/react";


// import mixpanel from 'mixpanel-browser';
import {ExpoMixpanelAnalytics} from './expomixpanel';
const mixpanel = new ExpoMixpanelAnalytics('c9edc36b0c9edd86c4fa8a64aa9818d1');

// mixpanel.init('c9edc36b0c9edd86c4fa8a64aa9818d1', {debug: true, ignore_dnt: true}); 

export function track(eventName, params) {
  mixpanel.track(eventName, params);
}

export function identify(userId) {
  mixpanel.identify(userId);
}

export function resetMixpanel() {
  mixpanel.reset();
}

export function getCurrentDomain() {
    console.log('web - getCurrentDomain', window.location.host);
    if (window.location.host.startsWith('localhost')) {
        return localWebDomain
    } else {
        return appDomain
    }
}


export function webInit() {
    document.body.style.setProperty('height','100%');
}
  
export function useCustomNavigation() {
    const {navigation} = useContext(AppContext)
    return navigation;
}

function limitSize({width, height, maxSize}) {
    if (width > height) {
      const bigSize = Math.min(maxSize, width);
      return {width: bigSize, height: bigSize * (height / width)}
    } else {
      const bigSize = Math.min(maxSize, height);
      return {height: bigSize, width: bigSize * (width / height)}
    }
}

export function resizeImageAsync({uri, rotate=false, maxSize = 400}) {
    return new Promise((resolve, reject) => {
        var img = new Image();
        img.onload = () => {
          const {width, height} = limitSize({width: img.width, height: img.height, maxSize});
          var c = document.createElement('canvas');
          c.width = width;
          c.height = height;
          var ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = c.toDataURL('image/jpeg', 0.8);
          const base64 = parsePhotoDataUri(dataUrl);
          resolve(base64);
        }
        img.src = uri;
    })
}

export function getTimeNow() {
    return Date.now()
}

export function historyPushState({state, url}) {
    history.pushState(state, '', url);
}




  export function setFaviconAlert(alertOn) {
    const links = document.getElementsByTagName('link');
    for (var i = 0; i < links.length; i++) {
        const link = links[i];
        const href = link.href;
        if (href.indexOf('favicon') != -1) {
            var newHref;
            if (alertOn) {
                newHref = href.replace('favicon', 'favicon_alert');
            } else {
                newHref = href.replace('favicon_alert', 'favicon');
            }   
            newHref = newHref.replace('http://localhost:19006', 'https://mix5.us');
            link.href = newHref;
        }
    }
  }
  

    export function setTitle(title) {
        if (title) {
            document.title = title + ' - ' + appName;
        }
    }   
  
  export class TitleBlinker extends React.Component {
    unmounted = false;
    componentDidMount() {
      // this.favicon = document.getElementById('favicon');
      this.maybeBlinkOn();
    }
    componentWillUnmount() {
      this.unmounted = true;
    }
    maybeBlinkOn(){
      const {count, focussed} = this.props;
      if (this.unmounted) return;
      setTimeout(() => this.maybeBlinkOff(), 1000);
      if (count && !focussed) {
        setTitle('New Message');
        setFaviconAlert(true);
      }
    }
    maybeBlinkOff(){
      const {title, count, focussed} = this.props;
      if (this.unmounted) return;
      setTimeout(() => this.maybeBlinkOn(), 1000);
      if (count && !focussed) {
        setTitle('(' + count + ') ' + title);
      } else {
        setTitle(title);
      }
      setFaviconAlert(false);
    }
    render() {
      return null;
    }
  }

  var global_soundObject = null;

  export function addFocusListener(callback) {
    return window.addEventListener('focus', callback);
  }

  export function removeFocusListener(callback) {
    return window.removeEventListener('focus', callback);
  }

  export function vibrate() {}



// export function PopupSelector({value, items, placeholder, style, textStyle, onSelect}) {
//   const currentLabel = findCurrentLabel(items, value) || placeholder;

//   return (
//     <PopupMenu items={items} onSelect={onSelect} popStyle={{top: 34}} textStyle={{fontSize: 20}}>
//       <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', borderColor: '#ddd', borderRadius: 8, borderWidth: 1, margin: 4, 
//           marginHorizontal: 16, flex: 1, padding: 8}}>
//         <Text>
//           {currentLabel}
//         </Text>    
//         <Entypo name='chevron-down' size={20} />
//       </View>
//     </PopupMenu>
//   )
// }



// export class PopupMenu extends React.Component {
//   state = {}
//   render() {
//     const {children, items, inverted, popStyle, textStyle, hasArrow, arrowStyle, onSelect} = this.props;
//     const {shown} = this.state;
//     return (
//       <View>
//         <FixedTouchable onPress={(() => this.setState({shown: !shown}))}>
//           {children}
//         </FixedTouchable>
//         {shown ? 
//           <View style={{position: 'absolute', borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth,
//               backgroundColor: 'white', zIndex: 10,
//               ...popStyle, flexShrink: 0}}>
//             {hasArrow ? 
//               <TopArrow style={{position: 'absolute', top: -10, right: 6, ...arrowStyle}} />
//             : null}
//             {items.map(i =>
//               <FixedTouchable key={i.id} onPress={() => {onSelect(i.id); this.setState({shown: false})}} > 
//                 <HoverView
//                   style={{paddingHorizontal: 8, paddingVertical: 4, flexShrink: 0, 
//                       backgroundColor: 'white', borderBottomColor: '#ddd', 
//                       borderBottomWidth: StyleSheet.hairlineWidth}}
//                   hoverStyle={{backgroundColor: inverted ? '#222' :'#f5f5f5'}}
//                   >
//                   <Text numberOfLines={1} style={{flexShrink: 0, 
//                         color: '#666', ...textStyle}}>{i.label}</Text> 
//                 </HoverView>
//               </FixedTouchable>
//             )}
//           </View>
//         : null }
//       </View>
//     )
//   }
// }

export async function requestNotifPermission() {
  const notifStatus = await Notification.requestPermission();
  return (notifStatus == 'granted');
}

export async function checkIfNotifsGranted() {
  return Notification.permission == 'granted';
}

export async function checkIfNotifsDenied() {
  return Notification.permission != 'default' && Notification.permission != 'granted';
}

export async function getNotifToken() {
  return await getFirebaseNotifTokenAsync();
}

export function captureException(e) {
  return Sentry.Browser.captureException(e);
}

export function setContext(dict) {
  return Sentry.Browser.setContext(dict);
}



export const ErrorBoundary = SentryBrowser.ErrorBoundary;

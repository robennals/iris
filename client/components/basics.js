import React, { useContext, useState } from 'react';
import { Image, Linking, Platform, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native"
import { appIcon, appName, appSlogan, baseBackgroundColor, baseColor } from '../data/config';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { AppContext } from './context';
import { FontAwesome } from '@expo/vector-icons';
import { getCurrentUser } from '../data/fbutil';

export function parsePhotoDataUri(uri) {
  if (uri.startsWith('data:image/jpeg;base64,')) {
    return uri.slice(23)
  } else {
    return null;
  }
}

export function commaSepStrings(strings) {
  console.log('strings', strings);
  const length = strings.length;
  return strings.map((str,i) => 
    (i == 0 ? '' : (i == length - 1 ? (length == 2 ? ' and ' : ', and ') : ', '))
    + str
  )  
}

export function getNotifAction(type) {
  switch (type) {
      case 'edit': return 'edited their message in';
      case 'like': return 'liked your message in';
      case 'reply': return 'replied in';
      case 'join': return 'joined';
      case 'tag': return 'tagged you in';
      default: return 'in';
  }
}

export function makePhotoDataUrl(base64data) {
  return 'data:image/jpeg;base64,' + base64data;
}

export function firstLine(text) {
    return text.split('\n')[0];
}

export function firstName(text) {
    return text.split(' ')[0];
}

export function stripNewLines(text) {
    return (text || '').replace(/\n/g, ' ');
}

export function searchNormalize(text) {
  return ' ' + text.toLowerCase();
}

export function toBool(val) {
  if (val) {
    return true;
  } else {
    return false;
  }
}

export function searchMatches(text, search) {
  return searchNormalize(text).indexOf(searchNormalize(search)) != -1;
}

export function OneLineText({children, style}) {
    if (Platform.OS == 'web') {
        return (
            <Text numberOfLines={1} style={[style, {whiteSpace: 'nowrap'}]}>
                {children}
            </Text>
        )
    } else {
        return <Text style={style} numberOfLines={1}>{children}</Text>
    }
}

export function getRootForMessage({messages, messageKey}) {
  const message = messages[messageKey];
  if (message.replyTo) {
      return getRootForMessage({messages, messageKey: message.replyTo});
  } else {
      return messageKey;
  }
}



export function MemberIcon({name, thumb=true, user, photo, style, size = 40, marginRight = null}) {
  return (
      <DefaultImage name={name} style={style} colorKey={name} 
        marginRight={marginRight} size={size} 
        radiusFactor={2} />
  )
}


export function GroupIcon({name, thumb=true, style, size = 40, marginRight = null}) {
    // const uri = getUrlForImage(thumb ? userInfo.thumb : userInfo.photo);
    // // Image.prefetch(uri);
    // if (userInfo.thumb) {
    //   return (
    //     <Image source={{uri, cache: 'force-cache'}} 
    //         style={[{width: size, height: size, borderRadius: size / 2, marginRight},style]} />
    //   )
    // } else {
      return (
        <DefaultImage name={name} style={style} colorKey={name} 
          marginRight={marginRight} size={size} 
          radiusFactor={8} />
      )
    // }
}

function hash(str) {
    var hash = 5381,
        i    = str.length;
    while(i) {
      hash = (hash * 33) ^ str.charCodeAt(--i);
    }
    return hash >>> 0;
  }
  
export function nameColor({name}) {
    if (!name) {
        return 'grey'
    }
    const nameFloat = (hash(name) % 64) / 64.0 
    const hue = 360 * nameFloat
    const color = 'hsl('+Math.floor(hue)+',100%, 30%)';
    // console.log('nameColor', hue)

    return color;
}

export function DefaultImage({name, colorKey, size, style, marginRight=null, radiusFactor = 2}) {
    const firstLetter = name ? name[0] : '?';
    const color = nameColor({name: colorKey});
    return (
      <View style={[{width: size, height: size, borderRadius: size/radiusFactor, marginRight, backgroundColor: color, alignItems: 'center', justifyContent: 'center'},style]}>
        <Text style={{fontSize: size*0.6, color: 'white'}}>{firstLetter}</Text>
      </View>
    )
  }

export function Link({title, url, children, inverted}) {
  if (Platform.OS == 'web') {
    return <a target='_blank' style={{color: inverted ? 'white' : 'rgb(29,161,242)'}} rel='noopener noreferrer' href={url}>{children}</a>
  } else {
    return (
      <Text style={{color: inverted ? 'white' : 'rgb(29,161,242)', textDecorationLine: inverted ? 'underline' : undefined}} onPress={()=>Linking.openURL(url)}>{children}</Text>
    )
  }
}

export function FormTitle({title, children}) {
  return (
      <View>
          <Text style={{fontSize: 12, marginTop: 16, marginHorizontal: 16, color: '#222', fontWeight: 'bold', marginTop: 8}}>{title}</Text>
          {children}
      </View>
  )
}

export function FormInput({autoFocus, onFocus, value, maxLength, textContentType, multiline=false, autoCompleteType, textAlign, placeholder, keyboardType, defaultValue, onChangeText, style}) {
  const textBoxStyle = {
    backgroundColor: 'white',
    padding: 8,
    borderColor: '#ddd',
    borderRadius: 8,
    borderWidth: 1,
    margin: 4,
    flex: 1,
    marginHorizontal: 16
  }
  if (Platform.OS == 'web') {
    return <TextInput placeholder={placeholder} style={style || textBoxStyle}
      defaultValue = {defaultValue} multiline={multiline}
      // textAlign = {textAlign}
      value = {value}
      maxLength = {maxLength}
      autoFocus={autoFocus}
      onChangeText={onChangeText}/>
  } else {
    return <TextInput placeholder={placeholder} style={style || textBoxStyle}
      textContentType={textContentType} multiline={multiline}
      keyboardType={keyboardType}
      autoCompleteType={autoCompleteType}
      underlineColorAndroid='transparent'
      textAlign = {textAlign}
      defaultValue = {defaultValue}
      value = {value}
      onFocus = {onFocus}
      onChangeText={onChangeText}/>
  }
}

export function FixedTouchable({onPress, onLongPress, dummy, style, children}) {
  if (dummy) {
    return <View style={{flex: 1}}>{children}</View>
  } else {
    return <TouchableOpacity onPress={onPress} onLongPress={onLongPress} style={style}>{children}</TouchableOpacity>
  }
}

export function ScreenContentScroll({children, contentOffset, scrollRef, style}) {
    return (
      <HeaderSpaceView>
        <StatusBar style='dark'/>
        <View style={{flex: 1, backgroundColor: 'white', ... style}}>
          <ScrollView contentOffset={contentOffset} ref={scrollRef}>        
            {/* <View style={{marginTop: 8}} />     */}
            <View style={{flex: 1, flexDirection: 'row', justifyContent: 'space-around'}}>
              <View style={{maxWidth: 600, paddingBottom: 200, flex: 1, alignItems: 'stretch'}}>
                {children}
              </View>
            </View>
          </ScrollView>
        </View>
      </HeaderSpaceView>
    )
}

export function HeaderSpaceView({children, style={}}) {
    if (Platform.OS != 'ios') {
        return <View style={[style, {flex: 1}]}>{children}</View>
    } else {
        return (
        <SafeAreaView style={{backgroundColor: 'white', ...style, flex: 1, paddingTop: Constants.statusBarHeight}}>
            {children}
        </SafeAreaView>
        )
    }
}
  

export function WideButton({onPress, children, progressText, disabled, alwaysActive, style, innerStyle}){
  const [clicked, setClicked] = useState(false);
  if (disabled || (clicked && !alwaysActive)) {
    return (
      <View style={[{padding: 8, borderRadius: 8, backgroundColor: '#aaa', margin: 16, 
            alignItems: 'center'},style]}>
        <Text style={{color: 'white', fontWeight: 'bold', marginHorizontal: 12, ...innerStyle}}>
          {(clicked && progressText) || children}
        </Text>
      </View>
    )
  } else {
    return (
      <FixedTouchable onPress={async () => {
        setClicked(true);
        await onPress();
      }}>
        <View style={[{padding: 8, borderRadius: 8, backgroundColor: baseColor, margin: 16, 
              alignItems: 'center'},style]}>
          <Text style={{color: 'white', fontWeight: 'bold', marginHorizontal: 12, ...innerStyle}}>
            {children}
          </Text>
        </View>
      </FixedTouchable>
    )
  }
}

export function LogoHeader() {
  return (
    <View>
      <View style={{flexDirection: 'row', alignItems: 'flex-start', padding: 16, borderBottomColor: '#eee', borderBottomWidth: 1}}>
        <Image style={{resizeMode: 'contain', width: 60, height: 50, marginRight: 10, marginLeft: 8}} source={{uri:appIcon}} />
        <View style={{flex: 1}}>
          <Text style={{fontWeight: 'bold', fontSize: 24}}>
              {appName}
          </Text>
          <Text style={{fontSize: 15, color: '#666'}}>
              {appSlogan}
          </Text>
        </View>
      </View>
    </View>
  )
}

export function ToggleCheck({value, onValueChange, label, style}) {
  return (
    <FixedTouchable onPress={() => onValueChange(!value)}>
      <View style={{flexDirection: 'row', alignItems: 'center', marginLeft: 10, ...style}}>
        <FontAwesome name={value ? 'check-circle' : 'circle-thin'} size={20} color={value ? baseColor : '#666'} />
        <Text style={{marginLeft: 4, color: '#666'}}>{label}</Text>
      </View>
    </FixedTouchable>
  )
}
  

export function getIsRootMessageVisibleToMe({members, messages, rootKey}) {
  const thisMember = members[getCurrentUser()];
  const rootMessage = messages[rootKey];
  if (rootMessage.membersOnly && 
          (thisMember.role == 'visitor' || 
          thisMember.memberTime && thisMember.memberTime > (rootMessage.firstTime || rootMessage.time))) {
      return false;
  } else {
    return true;
  }
}


export function getIsPostVisibleToMe({members, post}) {
  const thisMember = members[getCurrentUser()];
  if (post.membersOnly && 
          (thisMember.role == 'visitor' || 
          thisMember.memberTime && thisMember.memberTime > (post.firstTime || post.time))) {
      return false;
  } else {
    return true;
  }
}

export function getFirstMatch(list, func) {
  var idx = 0;
  while (idx < list.length) {
    if (func(list[idx])){ 
      return list[idx];
    }    
    idx++;
  }
  return null;
}
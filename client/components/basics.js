import React, { useContext, useState } from 'react';
import { Image, Linking, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native"
import { appIcon, appName, appSlogan, baseBackgroundColor, baseColor } from '../data/config';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { AppContext } from './context';
import { Entypo, FontAwesome } from '@expo/vector-icons';
import { getCurrentUser } from '../data/fbutil';

export function parsePhotoDataUri(uri) {
  if (uri.startsWith('data:image/jpeg;base64,')) {
    return uri.slice(23)
  } else {
    return null;
  }
}

export function boolToString(bool) {
  return bool ? 'true' : 'false'
}

export function andFormatStrings(strings) {
  const length = strings.length;
  return strings.map((str,i) => 
    (i == 0 ? '' : (i == length - 1 ? (length == 2 ? ' and ' : ', and ') : ', '))
    + str
  )  
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
  if (!text || !search) return false;
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



export function MemberIcon({name, hue, thumb=true, user, photo, style, size = 40, marginRight = null}) {
  return (
      <DefaultImage name={name} hue={hue} style={style} colorKey={name} 
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

export function DefaultImage({name, hue, colorKey, size, style, marginRight=null, radiusFactor = 2}) {
    const firstLetter = name ? name[0] : '?';
    // const color = nameColor({name: colorKey});
    const color = (hue != null) ? 'hsl(' + Math.floor(hue) + ', 100%, 30%)' : '#999';
    return (
      <View style={[{width: size, height: size, borderRadius: size/radiusFactor, marginRight, backgroundColor: color, alignItems: 'center', justifyContent: 'center'},style]}>
        {/* <Entypo name='user' size={size*0.8} /> */}
        <Text style={{fontSize: size*0.6, color: 'white'}}>{firstLetter}</Text>
      </View>
    )
  }

export function memberKeysToHues(memberKeys) {
    const filteredKeys = memberKeys.filter(k => k != 'zzz_irisbot' && k != getCurrentUser());
    var hueMap = {};
    for (var i = 0; i < filteredKeys.length; i++) {
        hueMap[filteredKeys[i]] = (360/filteredKeys.length) * i;
    }
    return hueMap;
}


export function Link({title, url, children, inverted, style}) {
  if (Platform.OS == 'web') {
    return <a target='_blank' style={style || {color: inverted ? 'white' : 'rgb(29,161,242)'}} rel='noopener noreferrer' href={url}>{children}</a>
  } else {
    return (
      <Text style={style || {color: inverted ? 'white' : 'rgb(29,161,242)', textDecorationLine: inverted ? 'underline' : undefined}} onPress={()=>Linking.openURL(url)}>{children}</Text>
    )
  }
}

export function FormTitle({title, children}) {
  return (
      <View>
          <Text style={{fontSize: 12, marginHorizontal: 16, color: '#222', fontWeight: 'bold', marginTop: 12}}>{title}</Text>
          {children}
      </View>
  )
}

export function FormInput({autoFocus, onFocus, onBlur, value, maxLength, textContentType, multiline=false, autoCompleteType, textAlign, placeholder, keyboardType, defaultValue, onChangeText, onSubmitEditing, style, extraStyle}) {
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
    return <TextInput placeholder={placeholder} style={style ? style : [textBoxStyle, extraStyle]}
      defaultValue = {defaultValue} multiline={multiline}
      // textAlign = {textAlign}
      value = {value}
      placeholderTextColor = '#666'
      maxLength = {maxLength}
      autoFocus={autoFocus}
      onFocus={onFocus} onBlur={onBlur}
      onSubmitEditing={onSubmitEditing}
      onChangeText={onChangeText}/>
  } else {
    return <TextInput placeholder={placeholder} style={style ? style : [textBoxStyle, extraStyle]}
      textContentType={textContentType} multiline={multiline}
      placeholderTextColor = '#666'
      keyboardType={keyboardType}
      autoCompleteType={autoCompleteType}
      underlineColorAndroid='transparent'
      textAlign = {textAlign}
      defaultValue = {defaultValue}
      onSubmitEditing = {onSubmitEditing}
      value = {value}
      onFocus = {onFocus} onBlur={onBlur}
      onChangeText={onChangeText}/>
  }
}

export function FormCheckbox({selected, onChangeSelected, label}) {
  return (
    <FixedTouchable onPress={() => onChangeSelected(!selected)} style={{marginHorizontal: 16, marginTop: 12}}>
      <View style={{flexDirection: 'row', alignItems: 'center'}}>
        <View style={{width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
          borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth}}>
          {selected ? 
            <Entypo name='check' />
          :null}
        </View>
        <Text style={{marginLeft: 8, fontSize: 12, color: '#222', fontWeight: 'bold'}}>{label}</Text>
      </View>
    </FixedTouchable>
  )
}

export function FixedTouchable({onPress, onLongPress, dummy, style, children}) {
  if (dummy) {
    return <View style={{flex: 1}}>{children}</View>
  } else {
    return <TouchableOpacity onPress={onPress} onLongPress={onLongPress} style={style}>{children}</TouchableOpacity>
  }
}

export function ScreenContentScroll({children, contentOffset, scrollRef, style, wideHeader = null, wideFooter = null}) {
    return (
      <HeaderSpaceView>
        <StatusBar style='dark'/>
        <View style={{flex: 1, backgroundColor: 'white', ... style}}>
          <ScrollView contentOffset={contentOffset} ref={scrollRef}>        
            {/* <View style={{marginTop: 8}} />     */}
            {wideHeader}
            <View style={{flex: 1, flexDirection: 'row', justifyContent: 'space-around'}}>
              <View style={{maxWidth: 600, paddingBottom: 200, flex: 1, alignItems: 'stretch'}}>
                {children}
              </View>
            </View>
            {wideFooter}
          </ScrollView>
        </View>
      </HeaderSpaceView>
    )
}

export function ScreenContentNoScroll({children, contentOffset, scrollRef, style}) {
  return (
    <HeaderSpaceView style={{flex: 1}}>
      <StatusBar style='dark'/>
      <View style={{flex: 1, backgroundColor: 'white', ... style}}>
          {/* <View style={{marginTop: 8}} />     */}
        <View style={{flex: 1, flexDirection: 'row', justifyContent: 'space-around'}}>
          <View style={{maxWidth: 600, paddingBottom: 200, flex: 1, alignItems: 'stretch'}}>
            {children}
          </View>
        </View>
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
  
export function MinorButton({onPress, children, style=null, innerStyle=null}) {
  return (
    <FixedTouchable onPress={onPress} >
      <View style={[{padding: 7, borderRadius: 8, borderColor: '#999', 
            borderWidth: StyleSheet.hairlineWidth, marginHorizontal: 8, 
            alignItems: 'center'},style]}>
        <Text style={{color: '#666', fontWeight: 'bold', marginHorizontal: 12, ...innerStyle}}>
          {children}
        </Text>
      </View>
    </FixedTouchable>
  )
}

  
export function SmallMinorButton({onPress, children, style=null, innerStyle=null}) {
  return (
    <FixedTouchable onPress={onPress} >
      <View style={[{padding: 4, borderRadius: 8, borderColor: '#999', 
            borderWidth: StyleSheet.hairlineWidth, marginHorizontal: 4, 
            alignItems: 'center'},style]}>
        <Text style={{color: '#666', fontWeight: 'bold', marginHorizontal: 12, fontSize: 12, ...innerStyle}}>
          {children}
        </Text>
      </View>
    </FixedTouchable>
  )
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
        <FontAwesome name={value ? 'check-circle' : 'circle-thin'} style={{marginTop: 2}} size={18} color={value ? baseColor : '#666'} />
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

export class HoverView extends React.Component {
  state = {};

  render() {
    const {children, style, hoverStyle} = this.props;
    const {hover} = this.state;

    return (
      <View style={[style, hover ? hoverStyle : null]}
        onMouseOver={() => this.setState({hover: true})}
        onMouseLeave={() => this.setState({hover: false})}
      >
        {children}
      </View>
    )
  }
}

export function validateEmail(email) {
  var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).trim().toLowerCase());
}

const nameRegex = /^\s*([A-Za-z.]{2,}([.,] |[-']| ))+([A-Za-z. ])*[A-Za-z]{2,}\.?\s*$/
export function validateName(name) {
  return name.match(nameRegex);
}


export const name_label = 'Full Name';
export const email_label = 'Email Address';

export const basicQuestions = [
  {question: name_label, answerType: 'name'},
  {question: email_label, answerType: 'email'}
]

export function shouldIgnoreQuestion(question) {
  if (question == name_label || question == email_label) {
    return true;
  } else if (question.indexOf('How many group chats') != -1) {
    return true;
  } else {
    return false;
  }
}

export function parseQuestions(questions) {
  const questionList = questions.trim().split('\n');
  const parsedQuestions = questionList.map(qtext => {
      // console.log('qtext', qtext);
      const [question, answerText] = qtext.split(':');
      var answerType;
      var options;
      if (answerText.trim().toLowerCase() == 'text') {
          answerType = 'text'
      } else {
          answerType = 'options'
          options = answerText.split(',').map(x => x.trim());
      }
      return {question, answerType, options};
  })
  return parsedQuestions;
}

export function splitFirst(text, sep) {
  const index = text.indexOf(sep);
  if (index != -1) {
    const first = text.slice(0, index);
    const rest = text.slice(index + sep.length);
    return [first, rest]
  } else {
    return [text, '']
  }
}

export function parseTopics(topicsTxt) {
  const topicList = topicsTxt.trim().split('#').filter(x=>x);
  const parsedTopics = topicList.map(ttxt => {
      const [title,rest] = splitFirst(ttxt, '\n');
      const questions = rest.split('*').filter(x=>x).map(x => x.trim());
      return {title: title.trim(), questions}
  })
  return parsedTopics;
}

export function textToKey(text) {
  return text.replace(/[\/\.\$\#\[\]]/g, '_');
}

export function mergeEditedParams({oldObj, newObj}) {
  var merged = {};
  Object.keys(newObj).forEach(k => {
      if (newObj[k] != null) {
          merged[k] = newObj[k]
      } else if (oldObj[k]) {
          merged[k] = oldObj[k];
      } else {
          merged[k] = '';
      }
  })
  return merged;
}

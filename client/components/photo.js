import React from 'react';
import { Image, Text, View, StyleSheet, Platform} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import { FixedTouchable, GroupIcon, makePhotoDataUrl, MemberIcon } from './basics';
import { Entypo, FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/core';
import { useCustomNavigation } from './shim';

export async function pickImage() {

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'Images',
    base64: true
  });
  console.log('result', {...result, base64:result.base64.slice(0,60), base64length: result.base64.length});
  return {result, uri: result.uri, base64: result.base64, width: result.width, height: result.height}
}

export function MemberProfilePhotoPlaceholder() {
    return (
        <View style={{justifyContent: 'space-around', alignItems: 'center', width: 150, height: 150, borderRadius: 75, borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth}}>
            <Text>Set Profile Photo</Text>
        </View>
    )
}

export function GroupProfilePhotoPlaceholder() {
    return (
        <View style={{justifyContent: 'space-around', alignItems: 'center', width: 150, height: 150, borderRadius: 25, borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth}}>
            <Text>Set Group Logo</Text>
        </View>
    )
}



export function MemberProfilePhotoPreview({photoKey, photoUser, photoData, onClearPhoto}) {
    return (
      <View style={{marginHorizontal: 12, marginBottom: 4, marginTop: 8, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-end'}}>
        <View style={{flexDirection: 'row'}}>
            <Image source={{uri: photoData ? makePhotoDataUrl(photoData) : getUrlForImage(photoKey, photoUser)}} 
              style={{width: 150, height: 150, borderRadius: 75}} />
        </View>
        <FixedTouchable onPress={onClearPhoto}>
          <Entypo name='circle-with-cross' size={20} color='#666' />
        </FixedTouchable>
      </View>
    )
}

export function GroupProfilePhotoPreview({photoKey, photoUser, photoData, onClearPhoto}) {
    return (
      <View style={{marginHorizontal: 12, marginBottom: 4, marginTop: 8, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-end'}}>
        <View style={{flexDirection: 'row'}}>
            <Image source={{uri: photoData ? makePhotoDataUrl(photoData) : getUrlForImage(photoKey, photoUser)}} 
              style={{width: 150, height: 150, borderRadius: 25}} />
        </View>
        <FixedTouchable onPress={onClearPhoto}>
          <Entypo name='circle-with-cross' size={20} color='#666' />
        </FixedTouchable>
      </View>
    )
}


export function MemberPhotoIcon({photoKey, user, name, style, size = 40}) {
    if (user == 'highlight') {
        return (
            <View style={{width: size, height: size, justifyContent: 'space-around', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: '#999', borderRadius: size / 2}}>
                <FontAwesome name='star' size={size *0.8} color='#999' />
            </View>
        )
    } else if (user && photoKey) {
        return (
            <Image source={{uri: getUrlForImage(photoKey, user, true), cache: 'force-cache'}} 
                style={{width: size, height: size, borderRadius: size / 2}} />
        )
    } else {
        return <MemberIcon name={name} style={style} size={size} />
    }
}

export function GroupPhotoIcon({photo, name, style, size = 40}) {
    if (photo && photo.key) {
        return (
            <Image source={{uri: getUrlForImage(photo.key, photo.user, true), cache: 'force-cache'}} 
                style={{...style, width: size, height: size, borderRadius: size / 8,
                    borderWidth: StyleSheet.hairlineWidth, borderColor: '#eee'}} />
        )
    } else {
        return <GroupIcon name={name} style={style} size={size} />
    }
}

export function PhotoPreview({photoKey, photoUser, photoData, onClearPhoto}) {
    return (
      <View style={{marginHorizontal: 12, marginBottom: 4, marginTop: 8, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-end'}}>
        <View style={{flexDirection: 'row'}}>
            <Image source={{uri: photoData ? makePhotoDataUrl(photoData) : getUrlForImage(photoKey, photoUser)}} 
              style={{width: 150, height: 150, borderRadius: 8}} />
        </View>
        <FixedTouchable onPress={onClearPhoto}>
          <Entypo name='circle-with-cross' size={20} color='#666' />
        </FixedTouchable>
      </View>
    )
}

export function MessagePhoto({photoKey, photoUser}) {
    const navigation = useCustomNavigation();
    return (
      <View style={{marginHorizontal: 0, marginBottom: 4, marginTop: 8, flexDirection: 'row', 
            alignItems: 'flex-start', justifyContent: 'flex-end',
            alignSelf: 'flex-start',
            borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth,
            borderRadius: 8}}>
        <FixedTouchable onPress={()=>navigation.navigate('photo', {photoKey, photoUser})} >
            <Image source={{uri: getUrlForImage(photoKey, photoUser), cache: 'force-cache'}} 
                  style={{width: 200, height: 200, borderRadius: 8}} />
        </FixedTouchable>
      </View>
    )
}

export function getUrlForFile(path) {
	const pathAsParam = encodeURIComponent(path);
	return 'https://firebasestorage.googleapis.com/v0/b/talkwell.appspot.com/o/' + pathAsParam + '?alt=media';
}

export function getUrlForImage(photoKey, photoUser, thumb=false) {
	return getUrlForFile((thumb ? 'thumb/' : 'image/') + photoUser + '/' + photoKey + '.jpeg');
}

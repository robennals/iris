import React from 'react';
import { View, Text } from 'react-native';
import IonIcons from 'react-native-vector-icons/Ionicons';
import Entypo from 'react-native-vector-icons/Entypo';
import { FixedTouchable, FormInput } from './basics';

export function SearchBox({onChangeText, value, style, placeholder='Search'}) {
  return (
    <View style={{marginVertical: 10, flex: 1}}>
      <View style={{borderRadius: 16, marginHorizontal: 8, flex: 1,
          flexDirection: 'row', alignItems: 'center', 
          backgroundColor: '#f5f5f5', ...style}}>
        <IonIcons name='ios-search' size={20} color='#999' style={{marginLeft: 8}} />
        <FormInput value={value || ''} underlineColorAndroid='transparent' placeholder={placeholder} 
            onChangeText={onChangeText} 
            style={{flex: 1, flexShrink: 1, width: '100%', fontSize: 16, padding: 8}}/>
        {!value ? null : 
          <FixedTouchable part='search-cancel' onPress={()=>onChangeText('')}>
            <Entypo name='circle-with-cross' size={20} color='#999' style={{marginHorizontal: 8}} />   
          </FixedTouchable>
        }
      </View>
    </View>
  )
}
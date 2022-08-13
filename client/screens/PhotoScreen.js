import { useNavigation } from '@react-navigation/core';
import React, { useEffect, useState } from 'react';
import { View, Text, Platform, Image } from 'react-native';
import { FixedTouchable } from '../components/basics';
import { getUrlForImage } from '../components/photo';

export function PhotoScreen({navigation, route}) {
    const {photoKey, photoUser} = route.params;
    return (
        <FixedTouchable style={{width: '100%', height: '100%', backgroundColor: 'white'}} onPress={() => navigation.goBack()} >
            <Image part='photo-image' source={{uri:getUrlForImage(photoKey, photoUser)}} 
                style={{resizeMode: 'contain', position: 'absolute', left: 0, top: 0, right: 0, bottom: 0}} />
        </FixedTouchable>
    )
}
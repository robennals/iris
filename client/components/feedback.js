import React, { useState } from 'react';
import _ from 'lodash';
import { StyleSheet, Text, View } from 'react-native';
import { FixedTouchable, FormInput } from './basics';
import { Entypo } from '@expo/vector-icons';
import { getCurrentUser, setDataAsync, useDatabase } from '../data/fbutil';
import { getCurrentDomain } from './shim';

const shadowStyle = {
    shadowRadius: 4, shadowColor: '#555', shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.5, elevation: 3}


function StarRating({rating, onChooseRating}) {
    const stars = [1,2,3,4,5];
    const descriptions = ['Terrible', 'Not great', 'Okay', 'Pretty good', 'Awesome'];
    return (
        <View style={{alignItems: 'center'}}>
            <View style={{flexDirection: 'row'}}>
                {stars.map(num => 
                    <FixedTouchable key={num} style={{alignSelf: 'center'}} onPress={() => onChooseRating(num)}>                   
                        <Entypo size={32} name={rating >= num ? 'star' : 'star-outlined'} 
                            color={rating >= num ? '#e68618' : '#999'} />
                    </FixedTouchable>                
                )}
            </View>
            {rating != 0 ?
                    <Text style={{color: '#666'}}>{descriptions[rating-1]}</Text>
            : null}            
        </View>
    )    
}

export function Feedback({archived, group}) {
    if (!archived) return null;
    const rating = useDatabase([group], ['perUser','groupRating',getCurrentUser(), group], 0);
    const extraText = useDatabase([group], ['perUser', 'groupFeedback', getCurrentUser(), group], '');
    // const [extraText, setExtraText] = useState('');

    function onChooseRating(rating) {
        setDataAsync(['perUser', 'groupRating', getCurrentUser(), group], rating);
        setDataAsync(['userPrivate', getCurrentUser(), 'group', group, 'rating'], rating);
    }

    function setExtraText(extraText) {
        setDataAsync(['perUser', 'groupFeedback', getCurrentUser(), group], extraText);

    }

    const expanded = extraText && extraText != '';

    return (
        <View style={{alignSelf: 'center', maxWidth: 550, marginTop: 32}}>
            <View style={{borderWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', borderRadius: 8,
            margin: 16, padding: 8, alignItems: 'center', alignSelf: expanded ? 'stretch' : 'center',
            ...shadowStyle}}>
                <Text style={{fontSize: 12, color: '#666', marginBottom: 8}}>This conversation has completed</Text>
                <Text style={{fontWeight: 'bold', marginBottom: 4}}>Rate this Conversation</Text>
                <StarRating rating={rating} onChooseRating={onChooseRating} />

                <FormInput multiline value={extraText || ''} onChangeText={setExtraText}
                    extraStyle={{marginTop: 16, minWidth: 200, marginHorizontal: 8, flex: null, height: expanded ? 200 : null, alignSelf: 'stretch' }} 
                    placeholder='Other Feedback (optional)'/>
            </View>
            <Text style={{color: '#666', fontSize: 12}}>
                Rating this conversation will help us match you with better conversations.
            </Text>

            {/* <View style={{borderWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', borderRadius: 8,
            margin: 16, padding: 8, maxWidth: 550, alignSelf: 'center',
            ...shadowStyle}}>
                <Text style={{fontWeight: 'bold', marginBottom: 4}}>Rate this Conversation
                </Text>
                <Text style={{color: '#666'}}>
                    Rating this conversation helps us match you better going forward.
                </Text>

            </View> */}

        </View>
    )
    return <Text>Feedback</Text>
}
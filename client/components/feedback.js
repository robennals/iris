import React, { useState } from 'react';
import _ from 'lodash';
import { StyleSheet, Text, View } from 'react-native';
import { FixedTouchable, FormInput, WideButton } from './basics';
import { Entypo } from '@expo/vector-icons';
import { getCurrentUser, setDataAsync, useDatabase } from '../data/fbutil';
import { getCurrentDomain } from './shim';
import { LinkText } from './linktext';

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
    const [localText, setLocalText] = useState(null);
    const [inProgress, setInProgress] = useState(false);
    const [submitted, setSubmitted] = useState(null);

    function onChooseRating(rating) {
        setDataAsync(['perUser', 'groupRating', getCurrentUser(), group], rating);
        setDataAsync(['userPrivate', getCurrentUser(), 'group', group, 'rating'], rating);
    }

    async function setExtraText(newText) {
        setInProgress(true);
        setSubmitted(extraText ? 'Updated' : 'Submitted');
        await setDataAsync(['perUser', 'groupFeedback', getCurrentUser(), group], newText);
        setLocalText(null);
        setInProgress(false);
    }

    const mergedText = localText == null ? extraText : localText;
    const expanded = mergedText && mergedText != '';
    
    return (
        <View style={{alignSelf: 'center', maxWidth: 550, marginTop: 32}}>
            <View style={{borderWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', borderRadius: 8,
            margin: 16, padding: 8, alignItems: 'center', alignSelf: expanded ? 'stretch' : 'center',
            backgroundColor: 'white',
            ...shadowStyle}}>
                <Text style={{fontSize: 12, color: '#666', marginBottom: 8}}>This conversation has completed</Text>
                <Text style={{fontWeight: 'bold', marginBottom: 4}}>Rate this Conversation</Text>
                <StarRating rating={rating} onChooseRating={onChooseRating} />

                <FormInput multiline value={mergedText || ''} onChangeText={setLocalText}
                    extraStyle={{marginTop: 16, minWidth: 200, marginHorizontal: 8, flex: null, height: expanded ? 200 : null, alignSelf: 'stretch' }} 
                    placeholder='Other Feedback (optional)'/>

                {submitted && !localText ? 
                    <Text style={{fontSize: 12, color: '#666'}}>{submitted}</Text>
                :null}
                {localText != null ? 
                    <WideButton style={{alignSelf:'flex-start', margin: 4}} onPress={() => setExtraText(localText)} alwaysActive 
                        disabled={inProgress} progressText={extraText ? 'Updating...' : 'Submitting...'}>
                        {extraText ? 'Update' : 'Submit'}
                    </WideButton>
                : null }
            </View>
            <Text style={{color: '#666', fontSize: 12, maxWidth: 250, marginHorizontal: 32, textAlign: 'center'}}>
                Rating this conversation will help us match you with better conversations.
            </Text>
        </View>
    )
}
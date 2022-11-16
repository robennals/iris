import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { OneLineText, ToggleCheck, WideButton } from '../components/basics';
import { KeyboardSafeView } from '../components/keyboardsafeview';
import { getCurrentUser, useDatabase } from '../data/fbutil';

var global_saveViewpointDrafts = {};

export function EditViewpointScreenHeader({route}) {
    const {community, topic} = route.params;
    const topicName = useDatabase([community, topic], ['topic', community, topic, 'name']);
    return (
        <View>
            <Text style={{fontSize: 12, fontWeight: 'bold'}}>Edit Your Viewpoint</Text>
            <OneLineText style={{fontSize: 16}}>
                {topicName}
            </OneLineText>
        </View>
    )
}

export function EditViewpointScreen({route}) {
    const {community, topic} = route.params;
    const [text, setText] = useState('');
    const [anonymous, setAnonymous] = useState(false);
    const oldViewPoint = useDatabase([community, topic], ['viewpoint', community, topic, getCurrentUser()], null)
    const defaultText = global_saveViewpointDrafts[topic] || oldViewPoint?.text || '';

    function onChangeText(text) {
        global_saveViewpointDrafts[topic] = text;
        setText(text);
    }

    return (
        <KeyboardSafeView>
            <View style={{flexDirection: 'row', justifyContent:'space-between', alignItems: 'center', 
                    borderBottomColor: '#ddd', borderBottomWidth: StyleSheet.hairlineWidth}}>
                <ToggleCheck value={anonymous} onValueChange={setAnonymous} label='Anonymous' style={{marginBottom: 4}} />
                <WideButton style={{margin: 2, paddingHorizontal: 4, paddingVertical: 2}}>{oldViewPoint ? 'Update' : 'Post'}</WideButton>            
            </View>
            <TextInput multiline placeholder='What is your view on this topic?' 
                style={{flex: 1, padding: 8}}
                defaultValue={defaultText}
                autoFocus
                onChangeText={onChangeText}
            />
        </KeyboardSafeView>
    )
    

}
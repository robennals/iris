import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { MinorButton, OneLineText, ToggleCheck, WideButton } from '../components/basics';
import { KeyboardSafeView } from '../components/keyboardsafeview';
import { useCustomNavigation } from '../components/shim';
import { getCurrentUser, useDatabase } from '../data/fbutil';
import { saveViewpointAsync } from '../data/servercall';

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
    const navigation = useCustomNavigation();
    const [text, setText] = useState(null);
    const [anonymous, setAnonymous] = useState(false);
    const oldViewPoint = useDatabase([community, topic], ['viewpoint', community, topic, getCurrentUser()], null)
    const defaultText = global_saveViewpointDrafts[topic] || oldViewPoint?.text || '';
    const [inProgress, setInProgress] = useState(false);

    function onChangeText(text) {
        global_saveViewpointDrafts[topic] = text;
        setText(text);
    }

    async function onPost() {
        setInProgress(true);
        await saveViewpointAsync({community, topic, anonymous, text});        
        setInProgress(false);
        navigation.goBack();
    }

    function onRevert() {
        global_saveViewpointDrafts[topic] = oldViewPoint?.text;
        setText(oldViewPoint?.text);        
    }

    const shownText = text == null ? (global_saveViewpointDrafts[topic] || oldViewPoint?.text) : text;

    return (
        <KeyboardSafeView>
            <View style={{flexDirection: 'row', justifyContent:'space-between', alignItems: 'center', 
                    borderBottomColor: '#ddd', borderBottomWidth: StyleSheet.hairlineWidth}}>
                {/* <ToggleCheck value={anonymous} onValueChange={setAnonymous} label='Anonymous' style={{marginBottom: 4}} /> */}
                <View />
                <View style={{flexDirection: 'row'}}>                    
                    {oldViewPoint && global_saveViewpointDrafts[topic] && global_saveViewpointDrafts[topic] != oldViewPoint.text ?
                        <MinorButton onPress={onRevert}
                            style={{margin: 2, paddingHorizontal: 4, paddingVertical: 1}}>
                            Revert
                        </MinorButton>
                    : null}
                    <WideButton alwaysActive disabled={inProgress} onPress={onPost} 
                        progressText={oldViewPoint ? 'Updating...' : 'Posting...'}
                        style={{margin: 2, paddingHorizontal: 4, paddingVertical: 2}}>{oldViewPoint ? 'Update' : 'Post'}</WideButton>            
                </View>
            </View>
            <TextInput multiline placeholder='What is your view on this topic?' 
                style={{flex: 1, padding: 8}}
                value={shownText}
                autoFocus
                onChangeText={onChangeText}
            />
        </KeyboardSafeView>
    )
    

}
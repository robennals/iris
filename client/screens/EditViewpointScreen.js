import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { FixedTouchable, MinorButton, OneLineText, ScreenContentNoScroll, ToggleCheck, WideButton } from '../components/basics';
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

// function ViewpointTopicSummary({community, topicKey}) {
//     const topic = useDatabase([community, topicKey], ['topic', community, topicKey]);
//     const [expanded, setExpanded] = useState(false);
//     if (!topic) return null;
//     if (expanded) {
//         return (
//             <FixedTouchable onPress={() => setExpanded(false)}>
//                 <Text>Expanded</Text>
//             </FixedTouchable>
//         )
//     } else {
//         return (
//             <FixedTouchable onPress={() => setExpanded(true)}>
//                 <Text>Collapsed</Text>
//             </FixedTouchable>
//         )
//     }
// }

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
        // <KeyboardSafeView style={{flex: 1}} behavior='height'>
        <KeyboardSafeView>
            <View style={{backgroundColor: 'white', flex: 1}}>
                {/* <ViewpointTopicSummary community={community} topicKey={topic} /> */}
                <View style={{flexDirection: 'row', justifyContent:'space-between', alignItems: 'center', 
                        borderBottomColor: '#ddd', borderBottomWidth: StyleSheet.hairlineWidth}}>
                    <View />
                    <View style={{flexDirection: 'row'}}>                    
                        {oldViewPoint && global_saveViewpointDrafts[topic] && global_saveViewpointDrafts[topic] != oldViewPoint.text ?
                            <MinorButton onPress={onRevert}
                                style={{margin: 4, paddingHorizontal: 4, paddingVertical: 1}}>
                                Revert
                            </MinorButton>
                        : null}
                        <WideButton alwaysActive disabled={inProgress || !text} onPress={onPost} 
                            progressText={!text ? null : (oldViewPoint ? 'Updating...' : 'Posting...')}
                            style={{margin: 4, paddingHorizontal: 4, paddingVertical: 2}}>{oldViewPoint ? 'Update' : 'Post'}</WideButton>            
                    </View>
                </View>
                <TextInput multiline placeholder='What is your view on this topic?' 
                    style={{flex: 1, padding: 8}}
                    value={shownText}
                    textAlignVertical='top'
                    onChangeText={onChangeText}
                />
                {/* <View style={{backgroundColor: 'blue', flex: 1}}/> */}
            </View>
        </KeyboardSafeView>
    )
}

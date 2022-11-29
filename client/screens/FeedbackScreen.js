import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { FixedTouchable, MinorButton, OneLineText, ScreenContentNoScroll, ToggleCheck, WideButton } from '../components/basics';
import { KeyboardSafeView } from '../components/keyboardsafeview';
import { useCustomNavigation } from '../components/shim';
import { getCurrentUser, useDatabase } from '../data/fbutil';
import { saveViewpointAsync, sendFeedbackAsync } from '../data/servercall';

export function FeedbackScreen() {
    const navigation = useCustomNavigation();
    const [text, setText] = useState('');
    const [sent, setSent] = useState(false);
    async function onSubmit() {
        await sendFeedbackAsync({text});
        setText('');
        setSent(true);
    }
    if (sent) {
        return (
            <ScreenContentNoScroll>
                <Text>Thank you for submitting your feedback. We read and reply to every message</Text>
                <WideButton onPress={() => navigation.goBack()}>Go Back</WideButton>
            </ScreenContentNoScroll>
        )
    }
    return (
        <KeyboardSafeView>
            <View style={{borderBottomColor: '#ddd', borderBottomWidth: StyleSheet.hairlineWidth, padding: 8}}>
                <Text style={{color: '#666'}}>
                    We very much appreciate people giving us feedback about how to improve Iris. We read and reply to every message
                    we receive.
                </Text>
            </View>
            <View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>                    
                <WideButton onPress={onSubmit} 
                        progressText='Submitting...'
                        style={{margin: 4, paddingHorizontal: 4, paddingVertical: 2}}>Submit</WideButton>            
            </View>
            <TextInput multiline placeholder='What is your feedback about Iris?' 
                style={{flex: 1, padding: 8}}
                value={text}
                textAlignVertical='top'
                onChangeText={setText}
            />
        </KeyboardSafeView>
    )
}
import { Entypo, Ionicons } from '@expo/vector-icons';
import React, { useContext, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getCurrentUser, getFirebaseServerTimestamp, newKey, setDataAsync } from '../data/fbutil';
import { logErrorAsync, sendMessageAsync } from '../data/servercall';
import { FixedTouchable, OneLineText } from './basics';
import { track } from './shim';

var global_saveDrafts = {};

export function ChatEntryBox({group, messages, groupName, community, members, reply, onClearReply, chatInputRef}) {
    const [inProgress, setInProgress] = useState(false);
    const [height, setHeight] = useState(36);
    const [nextHeight, setNextHeight] = useState(36);
    const [text, setText] = useState(null);
    const [textKey, setTextKey] = useState(0);
    const byMeCount = 0;

    const replyTo = reply?.key || null;
    const replyText = reply?.text || '';
    const replyName = reply?.name || '';

    function onContentSizeChange(event) {
        const contentHeight = event.nativeEvent.contentSize.height;

        if (contentHeight > height) {
            setHeight(contentHeight);
            setNextHeight(contentHeight);
        } else {
            setNextHeight(contentHeight);
            // setNextHeight(Math.max(36, Math.min(contentHeight, height - 20)))
        }
    }

    const mergedText = text != null ? text : (global_saveDrafts[group] || '');
    const textLength = mergedText.length;
    const maxMessageLength = 350;
    const textGettingLong = textLength > 300;
    const textTooLong = textLength > maxMessageLength;

    const maxByMe = 3;

    async function onSubmit() {
        if (!mergedText || textTooLong) {
            return;
        }
        const messageKey = newKey();
        setInProgress(true);
        onClearReply();
        setText('');
        global_saveDrafts[group] = null;
        setHeight(36);        
        setInProgress(false);
        const pLocalSend = setDataAsync(['userPrivate', getCurrentUser(), 'localMessage', group, messageKey], {
            time: getFirebaseServerTimestamp(),
            localTime: Date.now(),
            text: mergedText, replyTo, from: getCurrentUser(),
            pending: true
        })
        try {
            await sendMessageAsync({messageKey, group, text: mergedText, replyTo});
        } catch (e) {
            console.log('message send failed');
            await setDataAsync(['userPrivate', getCurrentUser(), 'localMessage', group, messageKey, 'failed'], true);    
        }
        try {
            track('Send Message', {length: mergedText.length, isReply: replyTo ? true : false, group, community, groupName});    
        } catch (error) {
            logErrorAsync({error: error.message, context: {from: 'MixPanel Send Message'}});
        }
        await pLocalSend;
    }

    function onChangeText(text) {
        setText(text);
        global_saveDrafts[group] = text;
    } 

    function onKeyPress(e) {
        if (Platform.OS == 'web' && e.nativeEvent.key == 'Enter') {
            if (!e.nativeEvent.shiftKey && !e.nativeEvent.ctrlKey && !e.nativeEvent.metaKey){
                onSubmit();    
                e.preventDefault();
                return false;
            }
        }
        return true;
    }

    const isWeb = Platform.OS == 'web'



    return (
        <View style={{borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', paddingHorizontal: 8, backgroundColor: 'white'}}>
            {replyTo ? 
                <View style={{flexDirection: 'row', justifyContent: 'space-between', 
                        paddingLeft: 8, marginTop: 8, marginBottom: 4, borderLeftColor: '#ddd', borderLeftWidth: StyleSheet.hairlineWidth}}>
                    <View style={{flex: 1}}>
                        <Text style={{fontSize: 12, marginBottom: 4}}>Replying to <Text style={{fontWeight: 'bold'}}>{replyName}</Text></Text>
                        <OneLineText style={{color: '#666'}}>{replyText}</OneLineText>
                    </View>
                    <FixedTouchable onPress={onClearReply}>
                         <Entypo name='circle-with-cross' size={20} color='#666' />
                    </FixedTouchable>
                </View>
            :null}
            {textTooLong ? 
                <Text style={{color: 'red', fontSize: 12, marginTop: 8, marginLeft: 8}}>Message is {textLength - maxMessageLength} chars too long</Text>
            : null}
            {textGettingLong && !textTooLong ?
                <Text style={{color: '#666', fontSize: 12, marginTop: 8, marginLeft: 8}}>{maxMessageLength - textLength} / {maxMessageLength} chars remaining</Text>
            :null}
            {byMeCount > maxByMe && mergedText.length > 0 ?
                <Text style={{color: 'red', fontSize: 12, marginTop: 8, marginLeft: 8}}>
                    You have written {byMeCount} messages in a row. Consider letting someone else speak before writing another message.
                </Text>
            : null}
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <TextInput // disabled={inProgress} 
                    key={textKey}
                    ref={chatInputRef}
                    value={mergedText}
                    onChangeText={onChangeText}
                    autoFocus={isWeb}
                    placeholder='Type a message'
                    placeholderTextColor={'#999'}
                    multiline
                    style={[{backgroundColor: '#f4f4f4', borderRadius: 8, 
                        borderWidth: StyleSheet.hairlineWidth, 
                        borderColor: '#ddd', padding: 8,
                        marginVertical: 8,
                        fontSize: 16, lineHeight: 20, flex: 1
                    }, {height: isWeb ? height : null}]}
                    onContentSizeChange={onContentSizeChange}
                    onKeyPress={onKeyPress}                
                />
                {textLength > 0 && !textTooLong ?
                    <FixedTouchable part='sendMessage' onPress={onSubmit} >
                        <Ionicons style={{marginHorizontal: 8}} name='md-send' size={24}  
                            color={inProgress ? '#999' : '#0084ff'} />
                    </FixedTouchable>
                : null}
            </View>
        </View>
    )
}
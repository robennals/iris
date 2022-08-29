import { Entypo, Ionicons } from '@expo/vector-icons';
import React, { useContext, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getCurrentUser, getFirebaseServerTimestamp, newKey, SERVER_TIMESTAMP, setDataAsync } from '../data/fbutil';
import { sendMessageAsync } from '../data/servercall';
import { FixedTouchable, OneLineText } from './basics';

export function ChatEntryBox({group, messages, members, replyTo, onClearReply, chatInputRef}) {
    const [inProgress, setInProgress] = useState(false);
    const [height, setHeight] = useState(36);
    const [nextHeight, setNextHeight] = useState(36);
    const [text, setText] = useState('');
    const [textKey, setTextKey] = useState(0);

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

    async function onSubmit() {
        if (!text) {
            return;
        }
        const messageKey = newKey();
        setInProgress(true);
        // setText('');
        // setTextKey(textKey+1);
        await setDataAsync(['userPrivate', getCurrentUser(), 'localMessage', group, messageKey], {
            time: getFirebaseServerTimestamp(),
            text, replyTo, from: getCurrentUser(),
            pending: true
        })
        onClearReply();
        setText('');
        setHeight(36);        
        setInProgress(false);
        await sendMessageAsync({messageKey, group, text, replyTo});
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
                        <Text style={{fontSize: 12, marginBottom: 4}}>Replying to <Text style={{fontWeight: 'bold'}}>{members[messages[replyTo].from].name}</Text></Text>
                        <OneLineText style={{color: '#666'}}>{messages[replyTo].text}</OneLineText>
                    </View>
                    <FixedTouchable onPress={onClearReply}>
                         <Entypo name='circle-with-cross' size={20} color='#666' />
                    </FixedTouchable>
                </View>
            :null}
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <TextInput // disabled={inProgress} 
                    key={textKey}
                    ref={chatInputRef}
                    value={text}
                    onChangeText={setText}
                    autoFocus={isWeb}
                    placeholder='Type a message'
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
                <FixedTouchable part='sendMessage' onPress={onSubmit} >
                <Ionicons style={{marginHorizontal: 8}} name='md-send' size={24}  
                    color={inProgress ? '#999' : '#0084ff'} />
                </FixedTouchable>
            </View>
        </View>
    )
}
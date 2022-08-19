import { Ionicons } from '@expo/vector-icons';
import React, { useContext, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { sendMessageAsync } from '../data/servercall';
import { FixedTouchable } from './basics';

export function ChatEntryBox({group}) {
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
        setInProgress(true);
        // setText('');
        // setTextKey(textKey+1);
        await sendMessageAsync({group, text});
        setText('');
        setHeight(36);        
        setInProgress(false);
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
        <View style={{flexDirection: 'row', backgroundColor: 'white', 
                borderTopWidth: StyleSheet.hairlineWidth, 
                borderColor: '#ddd', 
                alignItems: 'center', paddingHorizontal: 8}}>
            <TextInput // disabled={inProgress} 
                key={textKey}
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
    )
}
import React, { useEffect, useState } from 'react';
import { getCurrentUser, watchData } from '../data/fbutil';
import { playAlertSound } from './shim';

export function NewMessageSound(){ 
    const [lastMessageTime, setLastMessageTime] = useState(0);
    useEffect(() => {
        var x = {};
        watchData(x, ['userPrivate', getCurrentUser(), 'lastMessageTime'], time => {
            if (lastMessageTime && time != lastMessageTime) {
                playAlertSound();
            }
            setLastMessageTime(time);
        },[])
    })
    return null;
}
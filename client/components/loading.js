import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

export function Loading() {
    const [waited, setWaited] = useState(false);
    useEffect(() => {
        const timeout = setTimeout(() => {
            setWaited(true);
        }, 2000)
        return () => {
            clearTimeout(timeout);
        }
    }, []);   
    if (waited) {
        return (
            <View style={{flexDirection: 'row', alignSelf: 'center', flex: 1, justifyContent: 'center', alignItems: 'center'}}>    
                <Ionicons name='wifi' color='#666' size={20} />            
                <Text style={{marginLeft: 4, color: "#666"}}>Waiting for network</Text>
            </View>
        )
    } else { 
        return null;
    }
}
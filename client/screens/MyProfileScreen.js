import { Entypo } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { FixedTouchable, Link, ScreenContentScroll, WideButton } from '../components/basics';
import { MemberPhotoIcon } from '../components/photo';
import { chooseProfilePhotoAsync } from '../components/profilephoto';
import { firebaseSignOut, getCurrentUser, internalReleaseWatchers, watchData } from '../data/fbutil'

export function MyProfileScreen({navigation}) {
    const [photo, setPhoto] = useState();
    const [name, setName] = useState();
    const [uploading, setUploading] = useState();
    useEffect(() => {  
        var x = {};
        watchData(x, ['userPrivate', getCurrentUser(), 'photo'], setPhoto);
        watchData(x, ['userPrivate', getCurrentUser(), 'name'], setName);

        return () => internalReleaseWatchers(x);
    }, [getCurrentUser()])
   
    console.log('photo', photo, uploading);

    function signOut() {
        navigation.goBack();
        firebaseSignOut();        
    }

    return (
        <ScreenContentScroll>
            <FixedTouchable onPress={() => chooseProfilePhotoAsync(setUploading)}>
                <View style={{marginTop: 16, alignItems: 'center'}}>
                    <View style={{width: 200, height: 200}}>
                        {uploading ?
                            <View style={{width: 200, height: 200, borderRadius: 100, borderColor: '#666', borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center'}}>
                                <Text style={{color: '#666'}}>Uploading...</Text>
                            </View>
                        : 
                            <MemberPhotoIcon photoKey={photo} user={getCurrentUser()} name={name} thumb={false} size={200} />
                        }
                        <View style={{width: 40, height: 40, borderRadius: 20, backgroundColor: '#ddd', position: 'absolute', right: 8, bottom: 8, alignItems: 'center', justifyContent: 'center'}}>                        
                            <Entypo name='camera' size={24} />
                        </View>
                    </View>
                </View>
            </FixedTouchable>
            <View style={{marginTop: 16, alignItems: 'center'}}>
                <Text style={{fontSize: 32, fontWeight: 'bold'}}>{name}</Text>
            </View>

            <View style={{marginTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ddd' }} />
            <WideButton style={{alignSelf: 'center'}} onPress={() => signOut()}>
                Sign Out
            </WideButton>
            <Text style={{alignSelf: 'center', color: '#666'}}>To request that your account be deleted, email <Link url='mailto:acount@iris-talk.com'>account@iris-talk.com</Link></Text>
            
        </ScreenContentScroll>
    )

    return <Text>My Profile</Text>
}

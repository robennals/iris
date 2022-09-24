import { Entypo } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'
import { FixedTouchable, Link, ScreenContentScroll, WideButton } from '../components/basics';
import { Catcher } from '../components/catcher';
import { EnableNotifsBanner } from '../components/notifpermission';
import { MemberPhotoIcon, MemberProfilePhotoPlaceholder } from '../components/photo';
import { chooseProfilePhotoAsync } from '../components/profilephoto';
import { track } from '../components/shim';
import { callAuthStateChangedCallbacks, getCurrentUser, internalReleaseWatchers, isMasterUser, requestDelayedSignout, useDatabase, watchData } from '../data/fbutil'
import { releaseServerTokenWatch } from '../data/servercall';
import Constants from "expo-constants"
import { Loading } from '../components/loading';
import { version } from '../data/config';


function FakeErrorButton() {
    const [bad, setBad] = useState(false);
    if (bad) {
        return undefined.foo.foo;
    } else {
        return (        
            <WideButton style={{alignSelf: 'flex-start'}} onPress={() => setBad(true)}>
                Fake Error
            </WideButton>
        )
    }
}

export function MyProfileScreen({navigation}) {
    const [photo, setPhoto] = useState();
    const [name, setName] = useState();
    const [uploading, setUploading] = useState();
    const email = useDatabase([], ['special', 'userEmail', getCurrentUser()], 'no-email');
    useEffect(() => {  
        var x = {};
        watchData(x, ['userPrivate', getCurrentUser(), 'photo'], setPhoto, null);
        watchData(x, ['userPrivate', getCurrentUser(), 'name'], setName);

        return () => internalReleaseWatchers(x);
    }, [getCurrentUser()])
   
    const appVersion = Constants.expoConfig.version;
    const runtimeVersion = Constants.expoConfig.runtimeVersion;

    async function signOut() {
        track('Sign Out',{fromProfile: true});
        console.log('SIGNOUT!!');
        requestDelayedSignout();
        await navigation.popToTop();
        await releaseServerTokenWatch();        
        await callAuthStateChangedCallbacks(null);
        // await firebaseSignOut();        
    }

    return (
        <ScreenContentScroll wideHeader={<EnableNotifsBanner alwaysAsk />} >
                <View style={{marginTop: 16, alignItems: 'center'}}>
                <FixedTouchable onPress={() => chooseProfilePhotoAsync(setUploading)}>

                    <View style={{width: 200, height: 200}}>
                        {uploading ?
                            <View style={{width: 200, height: 200, borderRadius: 100, borderColor: '#666', borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center'}}>
                                <Text style={{color: '#666'}}>Uploading...</Text>
                            </View>
                        : (photo ? 
                            <MemberPhotoIcon photoKey={photo} user={getCurrentUser()} name={name} thumb={false} size={200} />
                            :
                            <MemberProfilePhotoPlaceholder size={200} />
                            )
                        }
                        <View style={{width: 40, height: 40, borderRadius: 20, backgroundColor: '#ddd', position: 'absolute', right: 8, bottom: 8, alignItems: 'center', justifyContent: 'center'}}>                        
                            <Entypo name='camera' size={24} />
                        </View>
                    </View>
                </FixedTouchable>
                </View>
            <View style={{marginTop: 16, alignItems: 'center'}}>
                <Text style={{fontSize: 32, fontWeight: 'bold'}}>{name}</Text>
            </View>

            <View style={{marginVertical: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ddd' }} />
            <View style={{alignItems: 'center'}}>
                <Text style={{marginBottom: 4, color: '#666'}}>App Version: {appVersion}/{runtimeVersion}/{version}</Text>
                <Text style={{marginBottom: 4, color: '#666'}}>User Email: {email}</Text>
                <Text style={{marginBottom: 4, color: '#666'}}>User Id: {getCurrentUser()}</Text>

            </View>

            <View style={{flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginTop: 16}}>
                <Text style={{color: '#666'}}>
                    <Link style={{color: '#666'}} url='https://iris-talk.com/privacy.html'>Privacy</Link>   <Link style={{color: '#666'}} url='https://iris-talk.com/license.html'>License</Link>
                </Text>
            </View>


            <View style={{marginTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ddd' }} />
            <View style={{flexDirection: 'row', alignSelf: 'center'}}>
                <WideButton style={{alignSelf: 'center'}} onPress={() => signOut()}>
                    Sign Out
                </WideButton>
                <WideButton onPress={() => navigation.navigate('unsubscribe')} >Leave Communities</WideButton>
            </View>
            {isMasterUser() ?
                <View style={{flexDirection: 'row', alignSelf: 'center'}}>
                    <Catcher context={{fake: 'yes'}}>
                        <FakeErrorButton />
                    </Catcher>
                    <WideButton alwaysActive onPress={() => navigation.navigate('adminLogin')}>Admin Login</WideButton>
                </View>
            :null}
            <Text style={{alignSelf: 'center', color: '#666'}}>To request that your account be deleted, email <Link url='mailto:account@iris-talk.com'>account@iris-talk.com</Link></Text>

        </ScreenContentScroll>
    )
}


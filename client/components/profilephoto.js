import { FontAwesome, Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text} from 'react-native';
import { getCurrentUser, watchData } from '../data/fbutil';
import { setProfilePhotoAsync } from '../data/servercall';
import { FixedTouchable, WideButton } from './basics';
import { pickImage } from './photo';
import { resizeImageAsync } from './shim';


export async function chooseProfilePhotoAsync(setUploading) {
    const bigPhoto = await pickImage();
    setUploading(true);
    const photoData = await resizeImageAsync({uri: bigPhoto.uri, bigPhoto, rotate: true, maxSize:  600})
    const thumbData = await resizeImageAsync({uri: bigPhoto.uri, bigPhoto, rotate: true, maxSize:  600})

    await setProfilePhotoAsync({photoData, thumbData});
    setUploading(false);
}


export function PhotoPromo() {
    const [photo, setPhoto] = useState('loading');
    const [uploading, setUploading] = useState(false);
    
    useEffect(() => {
        var x = {};
        watchData(x, ['userPrivate', getCurrentUser(), 'photo'], setPhoto, null);
    }, []);
    
    if (!photo) {
        return (
            <FixedTouchable onPress={()=>chooseProfilePhotoAsync(setUploading)}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
                  backgroundColor: '#F3F7C0', 
                  borderColor: '#ddd', borderWidth: StyleSheet.hairlineWidth, 
                  padding: 8, margin: 0}}>
                <FontAwesome name='smile-o' size={30}/>
                <Text style={{marginHorizontal: 8, flex: 1}}>
                  <Text style={{fontWeight: 'bold'}}>Choose a Profile Photo</Text> to show others who you are.
                </Text>
                <WideButton style={{margin: 0}} onPress={()=>chooseProfilePhotoAsync(setUploading)} disabled={uploading} progressText='Uploading...' alwaysActive>Choose Photo</WideButton>                
              </View>
          </FixedTouchable>
        )
    }

}
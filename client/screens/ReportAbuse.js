
import React, { useEffect, useState } from 'react'
import { FormInput, FormTitle, ScreenContentScroll, WideButton } from '../components/basics';
import { getCurrentUser, internalReleaseWatchers, watchData } from '../data/fbutil';
import { Picker, Text, View } from 'react-native';
import { reportAbuseAsync } from '../data/servercall';
import _ from 'lodash';
import { track } from '../components/shim';

export function ReportAbuseScreen({navigation, route}){
    const {community, thing, thingType} = route.params;
    const [submitted, setSubmitted] = useState(false);
    const [details, setDetails] = useState('');

    async function submit() {
        track('Report Abuse', {community, thing, thingType});
        setSubmitted(true);
        await reportAbuseAsync({community, thing, thingType, details});        
        // navigation.goBack();
    }

    if (submitted) {
        return (
            <ScreenContentScroll>
                <View style={{margin: 16}}>
                    <Text>Thank you for your report. We will look at it within 24 hours and get back to you if we need any more information.</Text>            
                </View>
            </ScreenContentScroll>
        )
    }

    return (
        <ScreenContentScroll>
                <FormTitle title='Details'>
                    <FormInput placeholder='Tell us what was bad' 
                        value={details} onChangeText={setDetails}
                    />
                </FormTitle>
                <WideButton onPress={() => submit()} progressText='Submitting...'
                        style={{alignSelf: 'center'}}>
                    Submit
                </WideButton>
        </ScreenContentScroll>
    )

}
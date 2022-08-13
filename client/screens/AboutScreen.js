import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FixedTouchable, FormInput, FormTitle, MemberIcon, ScreenContentScroll, WideButton } from '../components/basics';
import { getCurrentUser, watchData } from '../data/fbutil';
import _ from 'lodash';
import { baseColor } from '../data/config';
import { useCustomNavigation } from '../components/shim';

function Head({children}){
    return (
        <Text style={{fontSize: 20, alignSelf: 'center', textAlign: 'center', marginTop: 24, marginBottom: 8, color: '#222', fontWeight: '600'}}>
            {children}
        </Text>
    )
}

function Para({children}) {
    return (
        <Text style={{marginVertical: 8, fontSize: 16, lineHeight: 20, color: '#444'}}>
            {children}
        </Text>
    )
}

export function AboutScreen() {
    const navigation = useCustomNavigation();
    return (
        <ScreenContentScroll>
            <View style={{marginHorizontal: 32}}>
                <Text style={{fontSize: 40, fontWeight: '500', textAlign: 'center', alignSelf: 'center', marginTop: 16}}>
                    This is Talkwell
                </Text>
                <Head>Groups organized around People</Head>
                <Para>
                    Talkwell is a platform for small (&lt;50) socially meaningful groups of people who 
                    want to work together towards a common purpose.
                </Para>
                <Para>
                    Talkwell is organized around people. The primary view of a group is the people in it. 
                    Expand a person to see what they have been talking about, and maybe jump into conversation with them.
                </Para>

                <Head>Avoid the Tyranny of the Annoying</Head>

                <Para>
                    Other social products tend to be dominated by the people who talk loudest or talk most. 
                </Para>

                <Para>
                    In Talkwell, each person's posts are clustered under their name, making it easy to
                    make sure that everyone gets heard equally. You can talk as much without worrying 
                    about dominating the space, and it's easy to see if a quieter person has something to say.
                </Para>

                <Head>Easy to Join. Hard to Disrupt</Head>

                <Para>
                    A common problem with online groups is the apparent tension between making your 
                    group open enough that it can obtain new members, without making it so open that 
                    it gets taken over by disruptive people who don't respect group norms.
                </Para>

                <Para>
                    Talkwell distinguishes between Visitors and Members. It's easy to 
                    visit a group, but you need to earn the trust of the group's members 
                    to be made a member.
                </Para>

                <Head>Avoid Public Arguments</Head>
                <Para>
                    A common problem in online spaces is getting drawn into a public argument.
                    You say something dumb, and then find yourself having to defend it in front of an audience.
                </Para>
                <Para>
                    In Talkwell, if you say something dumb, you can edit your original message to say something
                    more reasonable. Crucially, and replies to that message will then be marked as "out of date"
                    and can no longer be replied to.
                </Para>
                
                <Head>Optimized for Talking "Well"</Head>
                <Para>
                    Talkwell is designed to help people talk "well". To have conversations that increase 
                    mutual respect and understanding. Sometimes this is in tension with engagement, monetization, and growth.
                </Para>
                <Para>
                    As Talkwell evolves, you can trust that we will stay true to this mission.
                </Para>

                <Head>Get Started Now</Head>

                <Para>
                    Join someone else's group by clicking on the invite link they shared with you, or <Text 
                        onPress={() => navigation.replace('new')} style={{alignSelf: 'flex-end', fontSize: 16, marginVertical: 8, color: baseColor}}>
                            create your own group
                        </Text> to invite people to.
                </Para>
        
            </View>
        </ScreenContentScroll>
    )
}

import { FontAwesome } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { Dimensions, InteractionManager, LogBox, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { minTwoPanelWidth } from '../data/config';
import { FixedTouchable } from './basics';
import { NavContext } from './context';
import _ from 'lodash';
import { historyPushState } from './shim';
import { Catcher, headerProtector, screenProtector } from './catcher';

const Stack = createStackNavigator();

function makeOptions({navigation, route}, screenOptions) {
    const options = {
        title: screenOptions.title,
        header: screenOptions.noHeader ? () => null : undefined,
        headerTitle: screenOptions.headerTitle ? 
            (({children}) => headerProtector(screenOptions.headerTitle, {navigation,route}, children))
            : undefined,        
    }
    return options;
}

export function CustomNavigator(params) {
    if (Platform.OS == 'web') {
        return <WebNavigator {...params} />
    } else {
        return <MobileNavigator {...params} />
    }
}

export const MemoCustomNavigator = React.memo(CustomNavigator);


export function MobileNavigator({screens, initialRouteName, linking, navigationRef}) {
    const screenNames = _.keys(screens);

    return (
        <View style={{flex: 1}}>
            <NavigationContainer key='navigator' style={{flex: 2}} ref={navigationRef} linking={linking}>
                <Stack.Navigator initialRouteName={initialRouteName} screenOptions={{headerBackTitleVisible: false}}>
                    {screenNames.map(n => 
                        <Stack.Screen name={n} key={n} component={screenProtector(screens[n].component)} 
                            options={({navigation,route}) => makeOptions({navigation,route}, screens[n])}
                        />
                    )}
                </Stack.Navigator>
            </NavigationContainer>
        </View>
    )
}

function getScreenStyle(navState, index, wide, screen) {
    if (!wide || screen == 'photo') {
        return {flex: 1, position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: index}
    } else if (navState.length > 2 && index != 0 && index != navState.length - 1) {
        return {display: 'none'}
    } else {
        return {flex: index == 0 ? 1 : 2, borderLeftWidth: StyleSheet.hairlineWidth, borderColor: '#ddd', transition: 'width 1s'}
    }
}

function getShrink(navState, index) {
    if (index == 0 && navState.length > 2) {
        return true;
    } else {
        return false;
    }
}

function ScreenTitle({navigation, screens, screen, params, options, navState}) {
    const screenInfo = screens[screen];
    const title = _.get(options, 'title') || _.get(screenInfo,'title');
    const component = _.get(options, 'headerTitle') || _.get(screenInfo, 'headerTitle');
    if (component) {
        return React.createElement(component, {navigation, route: {params}}, title);
    } else {
        return <Text style={{fontSize: 16, paddingHorizontal: 16, paddingVertical: 8}}>{title}</Text>
    }
}

function ScreenHeader({navigation, screens, screen, params, options, index, wide}) {
    const screenInfo = screens[screen];
    if (index == 0 || screenInfo.noHeader) {
        return null;
    }
    return (
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', borderBottomColor: '#ddd', borderBottomWidth: StyleSheet.hairlineWidth}}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                {(wide && index < 2) ? <View style={{width: 4, height: 44}} />  :
                    <FixedTouchable onPress={() => navigation.goBack()}>
                        <FontAwesome name='angle-left' size={40} color='#666' style={{paddingHorizontal: 8, height: 44}} />            
                    </FixedTouchable>
                }
                <ScreenTitle navigation={navigation} screens={screens} screen={screen} params={params} options={options} />
            </View>
            {_.get(options,'headerRight') ? 
                options.headerRight()
            : null}
        </View>
    )
}

function urlForNavState(navState, linking) {
    const topScreen = navState[navState.length - 1];
    return urlForScreen(topScreen, linking);
}

function urlForScreen(topScreen, linking) {
    const format = linking.config.screens[topScreen.screen];
    if (topScreen.screen == 'home') {
        return '/'
    }
    var path = '';
    if (format) {
        const partKeys = format.split('/:').slice(1);
        const parts = partKeys.map(k => topScreen.params[k]);
        path = '/' + _.join(parts, '/');
    }
    return '/' + topScreen.screen + path;
}


function setUrlFromNavState(navState, linking) {
    const url = urlForNavState(navState, linking);
    historyPushState({state: navState, url})
}

function navStateFromCurrentUrl(linking) {
    const path = window.location.pathname;
    const parts = path.split('/');
    const screen = parts[1];
    const format = linking.config.screens[screen];
    if (!screen) {
        return [
            {screen: 'home', params: {}}
        ]
    }
    if (!format) {
        return [
            {screen: 'home'},
            {screen}
        ]
    } else {
        const partKeys = format.split('/:').slice(1);
        var params = {};
        _.forEach(partKeys, (k,i) => {
            params[k] = parts[i+2];
        })
        return [
            {screen: 'home'},
            {screen, params}
        ]
    }
}

function convertNavStack(navStack) {
    const routes = navStack.routes;
    const newRoutes = routes.map(r => ({screen: r.name, params: r.params}));
    return newRoutes;
}


function ScreenHolder({padState, wide, navFunc, screens, screen, params, options, index}) {
    const navigation = useMemo(() => navFunc(index), [navFunc, index]);
    return (
        <NavContext.Provider value={navigation}>
            <View style={getScreenStyle(padState, index, wide, screen)}>
                <ScreenHeader navigation={navigation} screens={screens} screen={screen} 
                    params={params} options={options} index={index} wide={wide} />
                <Catcher style={{flex: 1}}>
                {React.createElement(screens[screen].component, {
                    navigation: navigation, 
                    route: {params: {...params, wide, alwaysShow: true}}, 
                    shrink: getShrink(padState, index), 
                    key: screen})}
                </Catcher>
            </View>
        </NavContext.Provider>
    )
}

const MemoScreenHolder = React.memo(ScreenHolder);

function basicReducer(state, action) {
    return action(state);
}


export function WebNavigator({screens, initialRouteName, linking}) {
    const [navState, updateNavState] = useReducer(basicReducer, navStateFromCurrentUrl(linking));
    const {width} = useWindowDimensions();
    const wide = width > minTwoPanelWidth;
    const padState = useMemo(() => 
        (wide && navState.length == 1) ? [...navState, {screen: 'about'}] : navState
    , [navState, wide]); 

    const navFunc = useCallback(index => ({
        navigate: (screen, params) => updateNavState(state => [...state.slice(0,index+1), {screen, params}]),
        replace: (screen, params) => updateNavState(state => [...state.slice(0, index), {screen, params}]),
        goBack: () => updateNavState(state => state.slice(0, index)),
        setOptions: (newOptions) => updateNavState(state => {
            const {screen, params, options} = state[index];
            return [...navState.slice(0, index), 
                {screen, params, options: {...options, ...newOptions}},
                ...navState.slice(index+1)
            ]            
        }),
        popToTop: () => updateNavState(() => [{screen: initialRouteName}]), 
        goHome: () => updateNavState(() => [{screen: initialRouteName}]),
        reset: (navStack) => updateNavState(() => convertNavStack(navStack))
    }), []);

    useEffect(() => {
        setUrlFromNavState(navState, linking);
    }, [navState])

    useEffect(() => {
        window.addEventListener('popstate', event => {
            console.log('popstate', event.state);
            if (event.state) {
                updateNavState(() => event.state);
                // setNavState(event.state)
            }
        })
    },[])

    return (
        <View style={{flex: 1}}>
            <View style={{flexDirection: 'row', flex: 1}}>
                {padState.map(({screen, params, options}, i) =>
                    <MemoScreenHolder key={urlForScreen({screen, params}, linking)} 
                        padState={padState} wide={wide} navFunc={navFunc} 
                        screens={screens} screen={screen} params={params} options={options} index={i} />
                )}
            </View>
        </View>
    )
}

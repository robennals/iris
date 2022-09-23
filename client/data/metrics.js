import { Platform } from "react-native";
import { people_set } from "../components/shim";
import * as Notifications from 'expo-notifications';
import Constants from "expo-constants"
import { getCurrentUser, getDataAsync } from "./fbutil";


export async function setUserPropertiesAsync() {
    var props = {};
    const pNotifToken = getDataAsync(['userPrivate', getCurrentUser(), 'notifToken'], null);
    const webToken = await getDataAsync(['userPrivate', getCurrentUser(), 'webNotifToken'], null);
    const notifToken = await pNotifToken;
    const notifStatus = await Notifications.getPermissionsAsync();

    props['Last Platform'] = Platform.OS;
    props['Has Platform ' + Platform.OS] = true;
    props['Mobile Notifs Connected'] = notifToken != null;
    props['Web Notifs Connected'] = webToken != null;
    props['App Version ' + Platform.OS] = Constants.expoConfig.version;
 
    if (Platform.OS != 'web') {
        props['Mobile Notifs Granted'] = notifStatus == 'granted';
    } else {
        props['Web Notifs Granted'] = notifStatus == 'granted';
    }
    console.log('set user properties', props);
    await people_set(props);
}


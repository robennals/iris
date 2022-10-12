import { Platform } from "react-native";
import { people_set } from "../components/shim";
import * as Notifications from 'expo-notifications';
import Constants from "expo-constants"
import { getCurrentUser, getDataAsync, setDataAsync, updateDataAsync } from "./fbutil";
import { version } from "./config";

function osName() {
    switch (Platform.OS) {
        case 'web': return 'Web';
        case 'ios': return 'iOS';
        case 'android': return 'Android';
        default: return 'Unknown'
    }
}

export async function setUserPropertiesAsync() {
    var props = {};
    const pNotifToken = getDataAsync(['userPrivate', getCurrentUser(), 'notifToken'], null);
    const webToken = await getDataAsync(['userPrivate', getCurrentUser(), 'webNotifToken'], null);
    const notifToken = await pNotifToken;
    const notifStatus = await Notifications.getPermissionsAsync();

    props['Last Platform'] = Platform.OS;
    props['Has Platform ' + osName()] = true;
    props['Mobile Notifs Connected'] = notifToken != null;
    props['Web Notifs Connected'] = webToken != null;
    props['App Version ' + osName()] = Constants.expoConfig.version;
    props['Hotfix ' + osName()] = version;

    
    if (Platform.OS != 'web') {
        props['Mobile Notifs Granted'] = notifStatus?.status;
    } else {
        props['Web Notifs Granted'] = notifStatus?.status;
    }
    // console.log('set user properties', props);
    updateDataAsync(['perUser', 'props', getCurrentUser()], props);
    await people_set(props);
}


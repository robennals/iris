import { useContext } from "react";
import { appDomain, localWebDomain } from "../data/config";
import { parsePhotoDataUri } from "./basics";
import { AppContext } from "./context";

export function getCurrentDomain() {
    console.log('web - getCurrentDomain', window.location.host);
    if (window.location.host.startsWith('localhost')) {
        return localWebDomain
    } else {
        return appDomain
    }
}


export function webInit() {
    document.body.style.setProperty('height','100%');
}
  
export function useCustomNavigation() {
    const {navigation} = useContext(AppContext)
    return navigation;
}

function limitSize({width, height, maxSize}) {
    if (width > height) {
      const bigSize = Math.min(maxSize, width);
      return {width: bigSize, height: bigSize * (height / width)}
    } else {
      const bigSize = Math.min(maxSize, height);
      return {height: bigSize, width: bigSize * (width / height)}
    }
}

export function resizeImageAsync({uri, rotate=false, maxSize = 400}) {
    return new Promise((resolve, reject) => {
        var img = new Image();
        img.onload = () => {
          const {width, height} = limitSize({width: img.width, height: img.height, maxSize});
          var c = document.createElement('canvas');
          c.width = width;
          c.height = height;
          var ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = c.toDataURL('image/jpeg', 0.8);
          const base64 = parsePhotoDataUri(dataUrl);
          resolve(base64);
        }
        img.src = uri;
    })
}

export function getTimeNow() {
    return Date.now()
}

export function historyPushState({state, url}) {
    history.pushState(state, '', url);
}


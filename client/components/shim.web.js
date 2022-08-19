import React from 'react';
import { useContext } from "react";
import { findDOMNode } from 'react-dom';
import { ScrollView } from 'react-native';
import { appDomain, appName, localWebDomain } from "../data/config";
import { parsePhotoDataUri } from "./basics";
import { Catcher } from './catcher';
import { AppContext } from "./context";
import {Audio} from 'expo-av';


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



export class BottomScroller extends React.Component {
    state = {rendered: false, atBottom: true}
    safariScrollToEnd() {
      const {atBottom} = this.state;
      if (atBottom) {
        const scroller = findDOMNode(this.scrollView);
        scroller.id = 'scroller';
        setTimeout(() => {
          scroller.scrollTop = scroller.scrollHeight;
          // scroller.scrollTo(0, scroller.scrollHeight)
          },100);
      }
    }
  
    maybeScrollToEnd(animated) {
      const {atBottom} = this.state;
      if (atBottom) {
        this.scrollView.scrollToEnd({animated: false});
      }
    }
  
    onScroll() {
      const {atBottom} = this.state;
      const scroller = findDOMNode(this.scrollView);
      if (!scroller) return null;
      const scrollBottom = scroller.scrollTop + scroller.parentNode.scrollHeight;
      const scrollGap = scroller.scrollHeight - scrollBottom;
  
      const newAtBottom = scrollGap < 40;
      if (atBottom != newAtBottom) {
        this.setState({atBottom: newAtBottom});
      }
    }
  
    render() {
      const {children, style} = this.props;
      const {rendered} = this.state;
      return (
      <ScrollView
        style={{...style, opacity: rendered ? 1 : 0}}
        ref={ref => this.scrollView = ref}
        onLayout={() => {
          // this.scrollView.scrollToEnd({animated: false}); 
          this.maybeScrollToEnd(false);
          this.setState({rendered: true});
        }}
        onScroll={() =>
          this.onScroll()
        }
        scrollEventThrottle={1}
        onContentSizeChange={(contentWidth, contentHeight)=>{        
            this.maybeScrollToEnd(true);
            // this.scrollView.scrollToEnd({animated: true});
        }}>
        {children}
      </ScrollView>
      )
    }
  }

export class BottomFlatScroller extends React.Component {
    safariScrollToEnd() {
      this.scroller && this.scroller.safariScrollToEnd();
    }
    
    render() {
      const {data, style} = this.props;
      
      return (
        <BottomScroller ref={r => this.scroller = r} style={style}>
          {data.map(({key, item, value}) => 
            <Catcher key={key}>
              {item || value()}
            </Catcher> 
          )}
        </BottomScroller>
      )
    }
  }

  export function setFaviconAlert(alertOn) {
    const links = document.getElementsByTagName('link');
    for (var i = 0; i < links.length; i++) {
        const link = links[i];
        const href = link.href;
        if (href.indexOf('favicon') != -1) {
            var newHref;
            if (alertOn) {
                newHref = href.replace('favicon', 'favicon_alert');
            } else {
                newHref = href.replace('favicon_alert', 'favicon');
            }   
            newHref = newHref.replace('http://localhost:19006', 'https://mix5.us');
            link.href = newHref;
        }
    }
  }
  

    export function setTitle(title) {
        if (title) {
            document.title = title + ' - ' + appName;
        }
    }   
  
  export class TitleBlinker extends React.Component {
    unmounted = false;
    componentDidMount() {
      // this.favicon = document.getElementById('favicon');
      this.maybeBlinkOn();
    }
    componentWillUnmount() {
      this.unmounted = true;
    }
    maybeBlinkOn(){
      const {count, focussed} = this.props;
      if (this.unmounted) return;
      setTimeout(() => this.maybeBlinkOff(), 1000);
      if (count && !focussed) {
        setTitle('New Message');
        setFaviconAlert(true);
      }
    }
    maybeBlinkOff(){
      const {title, count, focussed} = this.props;
      if (this.unmounted) return;
      setTimeout(() => this.maybeBlinkOn(), 1000);
      if (count && !focussed) {
        setTitle('(' + count + ') ' + title);
      } else {
        setTitle(title);
      }
      setFaviconAlert(false);
    }
    render() {
      return null;
    }
  }

  export async function playAlertSound() {
    // return;
    const soundObject = new Audio.Sound();
    try {
      await soundObject.loadAsync(require('../assets/pop.mp3'));
      await soundObject.playAsync();
      await soundObject.unloadAsync();
    } catch (error) {
    }  
  }

  export function addFocusListener(callback) {
    return window.addEventListener('focus', callback);
  }

  export function removeFocusListener(callback) {
    return window.removeEventListener('focus', callback);
  }
  
import { appDomain } from "../data/config";
import * as ImageManipulator from 'expo-image-manipulator';
import { useNavigation } from "@react-navigation/core";


export function getCurrentDomain(){ 
    return appDomain
}

export function webInit() {}

export async function resizeImageAsync({uri, pickedImage, rotate=false, maxSize = 400}) {
    const {width, height} = pickedImage;
    var newHeight; var newWidth;
    if (width > height) {
      newHeight = maxSize; 
      newWidth = Math.floor((width / height) * maxSize);
    } else {
      newWidth = maxSize;
      newHeight = Math.floor((height / width) * maxSize);
    }
  
    const result = await ImageManipulator.manipulateAsync(uri, [
        {resize: {width: newWidth, height: newHeight}}
      ],
      {format: 'jpeg', compress: 0.9, base64: true}
    );
    // const dataUrl = makeDataUrl({contentType: 'image/jpeg', base64data: result.base64})
    // return dataUrl;
    return result.base64;
}

export function getTimeNow() {
    return Date.now()
}

export function historyPushState({state, url}) {}

export function useCustomNavigation() {
  return useNavigation();
}

export class BottomFlatScroller extends React.Component {
  state = {}
  safariScrollToEnd() {}
  render() {
    const {data, style} = this.props;
    const {height} = this.state;    
    return (
      <View style={{flex: 1, justifyContent: 'flex-start', flexDirection: 'column'}}>
        <FlatList inverted initialNumToRender={20}
          style={{flex: 1, backgroundColor: 'white', /* maxHeight: height */}}
          keyboardDismissMode='on-drag'
          data={data.slice().reverse()}
          renderItem={basicRenderItem}
          onContentSizeChange={(width, height) => this.setState({height})}
        />
      </View>
    )
  }
}
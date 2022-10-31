import React from 'react';
import { findDOMNode } from 'react-dom';
import { ScrollView } from 'react-native';
import { Catcher } from './catcher';


export class BottomScroller extends React.PureComponent {
    state = {rendered: false, atBottom: true}
    safariScrollToEnd() {}
  
    maybeScrollToEnd(animated) {
      const {atBottom} = this.state;
      if (atBottom) {
        this.scrollView?.scrollToEnd({animated: false});
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
        // onScroll={() =>
        //   this.onScroll()
        // }
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

export class BottomFlatScroller extends React.PureComponent {
    safariScrollToEnd() {
      this.scroller && this.scroller.safariScrollToEnd();
    }
    
    render() {
      const {data, renderItem, style} = this.props;
      
      return (
        <BottomScroller ref={r => this.scroller = r} style={style}>
          {data.map(item => 
            <Catcher key={item.key}>
              {renderItem ? renderItem({item}) : (item.item || item.value())}
            </Catcher> 
          )}
        </BottomScroller>
      )
    }
  }  
  
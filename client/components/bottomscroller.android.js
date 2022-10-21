import React from 'react';
import { findDOMNode } from 'react-dom';
import { ScrollView } from 'react-native';
import { Catcher } from './catcher';


export class BottomScroller extends React.PureComponent {
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
        this.scrollView?.scrollToEnd({animated: false});
      }
    }
  
    // onScroll() {
    //   const {atBottom} = this.state;
    //   const scroller = findDOMNode(this.scrollView);
    //   if (!scroller) return null;
    //   const scrollBottom = scroller.scrollTop + scroller.parentNode.scrollHeight;
    //   const scrollGap = scroller.scrollHeight - scrollBottom;
  
    //   const newAtBottom = scrollGap < 40;
    //   if (atBottom != newAtBottom) {
    //     this.setState({atBottom: newAtBottom});
    //   }
    // }
  
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
  
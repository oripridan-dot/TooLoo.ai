import { GestureDetector, GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import { useRef } from 'react';
import { Animated } from 'react-native';

class GestureDetection {
  constructor(onGestureDetected) {
    this.onGestureDetected = onGestureDetected;
    this.panRef = useRef(null);
    this.translateX = useRef(new Animated.Value(0)).current;
    this.translateY = useRef(new Animated.Value(0)).current;
  }

  handleGesture = Animated.event(
    [
      {
        nativeEvent: {
          translationX: this.translateX,
          translationY: this.translateY,
        },
      },
    ],
    {
      useNativeDriver: false,
    }
  );

  onGestureEnd = (event) => {
    const { translationX, translationY } = event.nativeEvent;
    this.detectGesture(translationX, translationY);
    this.resetTranslation();
  };

  detectGesture(translationX, translationY) {
    if (Math.abs(translationX) > Math.abs(translationY)) {
      if (translationX > 50) {
        this.onGestureDetected('swipeRight');
      } else if (translationX < -50) {
        this.onGestureDetected('swipeLeft');
      }
    } else {
      if (translationY > 50) {
        this.onGestureDetected('swipeDown');
      } else if (translationY < -50) {
        this.onGestureDetected('swipeUp');
      }
    }
  }

  resetTranslation() {
    Animated.spring(this.translateX, {
      toValue: 0,
      useNativeDriver: false,
    }).start();
    Animated.spring(this.translateY, {
      toValue: 0,
      useNativeDriver: false,
    }).start();
  }

  render() {
    return (
      <GestureHandlerRootView>
        <PanGestureHandler
          ref={this.panRef}
          onGestureEvent={this.handleGesture}
          onEnded={this.onGestureEnd}
        >
          <Animated.View style={{ transform: [{ translateX: this.translateX }, { translateY: this.translateY }] }}>
            {/* Your component to detect gestures on */}
          </Animated.View>
        </PanGestureHandler>
      </GestureHandlerRootView>
    );
  }
}

export default GestureDetection;
/**
 * Created by vison on 17/8/20.
 */
import React from 'react';
import PropTypes from 'prop-types';
import {
  StyleSheet,
  Dimensions,
  Animated,
  TouchableWithoutFeedback,
  View,
  Easing
} from 'react-native';

const styles = StyleSheet.create({
  container: {
    opacity: 0,
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  containerVisible: {
    opacity: 1,
  },
  background: {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  popover: {
    backgroundColor: 'transparent',
    position: 'absolute',
    // shadowColor: 'black',
    // shadowOffset: { width: 0, height: 2 },
    // shadowRadius: 2,
    // shadowOpacity: 0.8,
  },
  content: {
    borderRadius: 6,
    padding: 6,
    backgroundColor: '#000',
  },
  arrow: {
    position: 'absolute',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
});

function Size(width, height) {
  this.width = width;
  this.height = height;
}

const noop = () => {};

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_ARROW_SIZE = new Size(10, 5);

function Point(x, y) {
  this.x = x;
  this.y = y;
}

function Rect(x, y, width, height) {
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
}

export default class PopOver extends React.Component {
  static propTypes = {
    isVisible: PropTypes.bool,
    onClose: PropTypes.func,
    placement: PropTypes.any,
    displayArea: PropTypes.any,
    fromRect: PropTypes.any,
    startCustomAnimation: PropTypes.any,
    arrowSize: PropTypes.any,
  };

  static defaultProps = {
    isVisible: false,
    displayArea: new Rect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT),
    arrowSize: DEFAULT_ARROW_SIZE,
    placement: 'auto',
    onClose: noop,
  };

  constructor(props) {
    super(props);
    this.state = {
      contentSize: {},
      anchorPoint: {},
      popoverOrigin: {},
      placement: 'auto',
      isTransitioning: false,
      defaultAnimatedValues: {
        scale: new Animated.Value(0),
        translate: new Animated.ValueXY(),
        fade: new Animated.Value(0),
      }
    };
  }

  measureContent = (x) => {
    const { width, height } = x.nativeEvent.layout;
    const contentSize = { width, height };
    const geom = this.computeGeometry({ contentSize });

    const isAwaitingShow = this.state.isAwaitingShow;
    this.setState(Object.assign(geom,
      { contentSize, isAwaitingShow: undefined }), () => {
      // Once state is set, call the showHandler so it can access all the geometry
      // from the state
      isAwaitingShow && this._startAnimation({ show: true });
    });
  }

  computeGeometry = ({ contentSize, placement = this.props.placement }) => {
    // placement = placement || this.props.placement;

    const options = {
      displayArea: this.props.displayArea,
      fromRect: this.props.fromRect,
      arrowSize: this.getArrowSize(placement),
      contentSize,
    };

    switch (placement) {
      case 'top':
        return this.computeTopGeometry(options);
      case 'bottom':
        return this.computeBottomGeometry(options);
      case 'left':
        return this.computeLeftGeometry(options);
      case 'right':
        return this.computeRightGeometry(options);
      default:
        return this.computeAutoGeometry(options);
    }
  }

  computeTopGeometry = ({ displayArea, fromRect, contentSize, arrowSize }) => {
    const popoverOrigin = new Point(
      Math.min(displayArea.x + displayArea.width - contentSize.width,
        Math.max(displayArea.x, fromRect.x + (fromRect.width - contentSize.width) / 2)),
      fromRect.y - contentSize.height - arrowSize.height);
    const anchorPoint = new Point(fromRect.x + fromRect.width / 2.0, fromRect.y);

    return {
      popoverOrigin,
      anchorPoint,
      placement: 'top',
    };
  }

  computeBottomGeometry = ({ displayArea, fromRect, contentSize, arrowSize }) => {
    const popoverOrigin = new Point(
      Math.min(displayArea.x + displayArea.width - contentSize.width,
        Math.max(displayArea.x, fromRect.x + (fromRect.width - contentSize.width) / 2)),
      fromRect.y + fromRect.height + arrowSize.height);
    const anchorPoint = new Point(fromRect.x + fromRect.width / 2.0, fromRect.y + fromRect.height);

    return {
      popoverOrigin,
      anchorPoint,
      placement: 'bottom',
    };
  }

  computeLeftGeometry = ({ displayArea, fromRect, contentSize, arrowSize }) => {
    const popoverOrigin = new Point(fromRect.x - contentSize.width - arrowSize.width,
      Math.min(displayArea.y + displayArea.height - contentSize.height,
        Math.max(displayArea.y, fromRect.y + (fromRect.height - contentSize.height) / 2)));
    const anchorPoint = new Point(fromRect.x, fromRect.y + fromRect.height / 2.0);

    return {
      popoverOrigin,
      anchorPoint,
      placement: 'left',
    };
  }

  computeRightGeometry = ({ displayArea, fromRect, contentSize, arrowSize }) => {
    const popoverOrigin = new Point(fromRect.x + fromRect.width + arrowSize.width,
      Math.min(displayArea.y + displayArea.height - contentSize.height,
        Math.max(displayArea.y, fromRect.y + (fromRect.height - contentSize.height) / 2)));
    const anchorPoint = new Point(fromRect.x + fromRect.width, fromRect.y + fromRect.height / 2.0);

    return {
      popoverOrigin,
      anchorPoint,
      placement: 'right',
    };
  }

  computeAutoGeometry = ({ displayArea, contentSize }) => {
    const placementsToTry = ['top', 'bottom'];
    let geom;
    for (let i = 0; i < placementsToTry.length; i++) {
      const placement = placementsToTry[i];
      geom = this.computeGeometry({ contentSize, placement });
      const { popoverOrigin } = geom;

      if (popoverOrigin.x >= displayArea.x
        && popoverOrigin.x <= displayArea.x + displayArea.width - contentSize.width
        && popoverOrigin.y >= displayArea.y
        && popoverOrigin.y <= displayArea.y + displayArea.height - contentSize.height) {
        break;
      }
    }
    return geom;
  }

  getArrowSize = (placement) => {
    const size = this.props.arrowSize;
    switch (placement) {
      case 'left':
      case 'right':
        return new Size(size.height, size.width);
      default:
        return size;
    }
  }

  getArrowColorStyle = (color) => {
    return { borderTopColor: color };
  }

  getArrowRotation = (placement) => {
    switch (placement) {
      case 'bottom':
        return '180deg';
      case 'left':
        return '-90deg';
      case 'right':
        return '90deg';
      default:
        return '0deg';
    }
  }

  getArrowDynamicStyle = () => {
    const { anchorPoint, popoverOrigin } = this.state;
    const arrowSize = this.props.arrowSize;

    // Create the arrow from a rectangle with the appropriate borderXWidth set
    // A rotation is then applied dependending on the placement
    // Also make it slightly bigger
    // to fix a visual artifact when the popover is animated with a scale
    const width = arrowSize.width + 2;
    const height = arrowSize.height * 2 + 2;

    return {
      left: anchorPoint.x - popoverOrigin.x - width / 2,
      top: anchorPoint.y - popoverOrigin.y - height / 2,
      width,
      height,
      borderTopWidth: height / 2,
      borderRightWidth: width / 2,
      borderBottomWidth: height / 2,
      borderLeftWidth: width / 2,
    };
  }

  getTranslateOrigin = () => {
    const { contentSize, popoverOrigin, anchorPoint } = this.state;
    const popoverCenter = new Point(popoverOrigin.x + contentSize.width / 2,
      popoverOrigin.y + contentSize.height / 2);
    return new Point(anchorPoint.x - popoverCenter.x, anchorPoint.y - popoverCenter.y);
  }

  componentWillReceiveProps(nextProps: any) {
    const willBeVisible = nextProps.isVisible;
    const {
      isVisible,
      } = this.props;

    if (willBeVisible !== isVisible) {
      if (willBeVisible) {
        // We want to start the show animation only when contentSize is known
        // so that we can have some logic depending on the geometry
        this.setState({ contentSize: {}, isAwaitingShow: true });
      } else {
        this._startAnimation({ show: false });
      }
    }
  }

  _startAnimation = ({ show }) => {
    const handler = this.props.startCustomAnimation || this._startDefaultAnimation;
    handler({ show, doneCallback: () => this.setState({ isTransitioning: false }) });
    this.setState({ isTransitioning: true });
  }

  _startDefaultAnimation = ({ show, doneCallback }) => {
    const animDuration = 10;
    const values = this.state.defaultAnimatedValues;
    const translateOrigin = this.getTranslateOrigin();

    if (show) {
      values.translate.setValue(translateOrigin);
    }

    const commonConfig = {
      duration: animDuration,
      easing: show ? Easing.out(Easing.back()) : Easing.inOut(Easing.quad),
    };

    Animated.parallel([
      Animated.timing(values.fade, {
        toValue: show ? 1 : 0,
        ...commonConfig,
      }),
      Animated.timing(values.translate, {
        toValue: show ? new Point(0, 0) : translateOrigin,
        ...commonConfig,
      }),
      Animated.timing(values.scale, {
        toValue: show ? 1 : 0,
        ...commonConfig,
      })
    ]).start(doneCallback);
  }

  _getDefaultAnimatedStyles = () => {
    // If there's a custom animation handler,
    // we don't return the default animated styles
    if (typeof this.props.startCustomAnimation !== 'undefined') {
      return null;
    }

    const animatedValues = this.state.defaultAnimatedValues;

    return {
      backgroundStyle: {
        opacity: animatedValues.fade,
      },
      arrowStyle: {
        transform: [
          {
            scale: animatedValues.scale.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
              extrapolate: 'clamp',
            }),
          }
        ],
      },
      contentStyle: {
        transform: [
          { translateX: animatedValues.translate.x },
          { translateY: animatedValues.translate.y },
          { scale: animatedValues.scale },
        ],
      }
    };
  }

  _getExtendedStyles = () => {
    const background = [];
    const popover = [];
    const arrow = [];
    const content = [];

    [this._getDefaultAnimatedStyles(), this.props].forEach((source) => {
      if (source) {
        background.push(source.backgroundStyle);
        popover.push(source.popoverStyle);
        arrow.push(source.arrowStyle);
        content.push(source.contentStyle);
      }
    });

    return {
      background,
      popover,
      arrow,
      content,
    };
  }

  render() {
    if (!this.props.isVisible && !this.state.isTransitioning) {
      return null;
    }

    const { popoverOrigin, placement } = this.state;
    const extendedStyles = this._getExtendedStyles();
    const contentStyle = [styles.content, ...extendedStyles.content];
    const arrowColor = StyleSheet.flatten(contentStyle).backgroundColor;
    const arrowColorStyle = this.getArrowColorStyle(arrowColor);
    const arrowDynamicStyle = this.getArrowDynamicStyle();
    const contentSizeAvailable = this.state.contentSize.width;

    // Special case, force the arrow rotation even if it was overriden
    let arrowStyle = [styles.arrow, arrowDynamicStyle, arrowColorStyle, ...extendedStyles.arrow];
    const arrowTransform = (StyleSheet.flatten(arrowStyle).transform || []).slice(0);
    arrowTransform.unshift({ rotate: this.getArrowRotation(placement) });
    arrowStyle = [...arrowStyle, { transform: arrowTransform }];

    return (
      <TouchableWithoutFeedback onPress={this.props.onClose}>
        <View style={[styles.container, contentSizeAvailable && styles.containerVisible]}>
          <Animated.View style={[styles.background, ...extendedStyles.background]} />
          <Animated.View
            style={[styles.popover, { top: popoverOrigin.y, left: popoverOrigin.x }, ...extendedStyles.popover]}
          >
            <Animated.View style={arrowStyle} />
            <Animated.View ref="content" onLayout={this.measureContent} style={contentStyle}>
              {this.props.children}
            </Animated.View>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    );
  }
}

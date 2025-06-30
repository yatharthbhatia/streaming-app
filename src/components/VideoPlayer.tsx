import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Button, ActivityIndicator, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import * as WebBrowser from 'expo-web-browser';

const API_URL = process.env.EXPO_PUBLIC_SOCKET_URL;

export default function VideoPlayer({ roomCode, watchUrl, sessionParam, onVideoLog }) {
  const [loading, setLoading] = useState(false);
  const [webViewLoading, setWebViewLoading] = useState(true);
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(watchUrl);

  useEffect(() => {
    setCurrentUrl(watchUrl);
    setWebViewLoading(true);
  }, [watchUrl]);

  const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const videoId = getYouTubeId(watchUrl);
  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  const directLink = !videoId ? watchUrl : null;

  const handleOpenInBrowser = async () => {
    if (!watchUrl) {
      Alert.alert('No video URL', 'No video URL is available to open.');
      return;
    }
    setLoading(true);
    try {
      const urlToOpen = currentUrl || directLink || watchUrl;
      await WebBrowser.openBrowserAsync(urlToOpen, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        controlsColor: '#000000',
        toolbarColor: '#ffffff',
      });
    } catch (error) {
      Alert.alert('Error', 'Could not open the browser.');
    } finally {
      setLoading(false);
    }
  };

  const getServiceSpecificHeaders = (url) => {
    const baseHeaders = {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
    };
    if (url?.includes('netflix.com')) {
      return {
        ...baseHeaders,
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
      };
    }
    if (url?.includes('primevideo.com')) {
      return {
        ...baseHeaders,
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
      };
    }
    return baseHeaders;
  };

  return (
    <View style={styles.container}>
      {watchUrl ? (
        <>
          <View style={styles.webViewContainer}>
            {/* Browser Navigation Bar */}
            <View style={styles.navigationBar}>
              <TouchableOpacity 
                style={[styles.navButton, !canGoBack && styles.navButtonDisabled]}
                onPress={() => webViewRef.current?.goBack()}
                disabled={!canGoBack}
              >
                <Text style={[styles.navButtonText, !canGoBack && styles.navButtonTextDisabled]}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.navButton, !canGoForward && styles.navButtonDisabled]}
                onPress={() => webViewRef.current?.goForward()}
                disabled={!canGoForward}
              >
                <Text style={[styles.navButtonText, !canGoForward && styles.navButtonTextDisabled]}>Forward</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.navButton}
                onPress={() => webViewRef.current?.reload()}
              >
                <Text style={styles.navButtonText}>Refresh</Text>
              </TouchableOpacity>
              {/* <View style={styles.urlBar}>
                <Text style={styles.urlBarText} numberOfLines={1}>
                  {currentUrl || watchUrl}
                </Text>
              </View> */}
            </View>
            {webViewLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>Loading video...</Text>
              </View>
            )}
            <WebView
              ref={webViewRef}
              source={{ 
                uri: directLink || watchUrl,
                headers: getServiceSpecificHeaders(directLink || watchUrl)
              }}
              style={styles.webView}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              scalesPageToFit={false}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              allowsFullscreenVideo={true}
              allowsProtectedMedia={true}
              mixedContentMode="compatibility"
              thirdPartyCookiesEnabled={true}
              sharedCookiesEnabled={true}
              cacheEnabled={true}
              incognito={false}
              setSupportMultipleWindows={false}
              allowsLinkPreview={false}
              showsHorizontalScrollIndicator={true}
              showsVerticalScrollIndicator={true}
              bounces={false}
              scrollEnabled={true}
              automaticallyAdjustContentInsets={false}
              contentInsetAdjustmentBehavior="never"
              decelerationRate={0.99}
              allowsBackForwardNavigationGestures={true}
              userAgent="Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('WebView error: ', nativeEvent);
                Alert.alert('WebView Error', 'Failed to load video. Try opening in external browser.');
              }}
              onLoadStart={() => setWebViewLoading(true)}
              onLoadEnd={() => setWebViewLoading(false)}
              onNavigationStateChange={(navState) => {
                setCanGoBack(navState.canGoBack);
                setCanGoForward(navState.canGoForward);
                setCurrentUrl(navState.url);
              }}
              onShouldStartLoadWithRequest={() => true}
              originWhitelist={['*']}
              allowFileAccess={true}
              allowFileAccessFromFileURLs={true}
              allowUniversalAccessFromFileURLs={true}
              onMessage={(event) => {
                // Handle web page msgs
                console.log('WebView message:', event.nativeEvent.data);
              }}
              // injectedJavaScript={`
              //   (function() {
              //     // Remove overlays/popups
              //     const removeOverlays = () => {
              //       const overlays = document.querySelectorAll('[class*="overlay"], [class*="popup"], [class*="modal"], [id*="overlay"], [id*="popup"]');
              //       overlays.forEach(el => {
              //         if (el.style.position === 'fixed' || el.style.position === 'absolute') {
              //           el.style.display = 'none';
              //         }
              //       });
              //     };
              //     const enhanceVideoPlayer = () => {
              //       const videos = document.querySelectorAll('video');
              //       videos.forEach(video => {
              //         video.setAttribute('controls', 'true');
              //         video.setAttribute('preload', 'metadata');
              //         video.style.maxWidth = '100%';
              //         video.style.height = 'auto';
              //       });
              //     };
              //     removeOverlays();
              //     enhanceVideoPlayer();
              //     setInterval(() => {
              //       removeOverlays();
              //       enhanceVideoPlayer();
              //     }, 2000);
              //     document.addEventListener('contextmenu', function(e) {
              //       e.preventDefault();
              //     });
              //     document.addEventListener('fullscreenchange', function() {
              //       window.ReactNativeWebView.postMessage(JSON.stringify({
              //         type: 'fullscreen',
              //         isFullscreen: !!document.fullscreenElement
              //       }));
              //     });
              //     true;
              //   })();
              // `}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button 
              title={loading ? "Opening..." : "Open in External Browser"} 
              onPress={handleOpenInBrowser}
              disabled={loading}
            />
          </View>
        </>
      ) : (
        <View style={styles.noVideoContainer}>
          <Text style={styles.noVideoText}>
            No video URL provided. Share a video link in the chat to get started!
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webViewContainer: {
    flex: 1,

    backgroundColor: '#000',
    borderRightWidth: 0,
    borderRightColor: '#333',
  },
  navigationBar: {
    flexDirection: 'row',
    backgroundColor: '#222',
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  navButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    borderRadius: 4,
  },
  navButtonDisabled: {
    backgroundColor: '#1a1a1a',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  navButtonTextDisabled: {
    color: '#666',
  },
  urlBar: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#444',
  },
  urlBarText: {
    color: '#ccc',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  webView: {
    flex: 1,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#111',
    alignItems: 'center',
  },
  noVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1a1a1a',
  },
  noVideoText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
});
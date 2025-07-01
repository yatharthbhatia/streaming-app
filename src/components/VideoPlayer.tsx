import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Button, ActivityIndicator, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import * as WebBrowser from 'expo-web-browser';
import { sendVideoLogToBackend } from '../utils/videoLogger';
import ChatPanel from './ChatPanel';

const API_URL = process.env.EXPO_PUBLIC_SOCKET_URL;

const VIDEO_LOGGER_SCRIPT = `
(function mergedVideoLogger() {
    // --- Utility functions ---
    function formatTime(s) {
      const h = String(Math.floor(s / 3600)).padStart(2, '0');
      const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
      const sec = String(Math.floor(s % 60)).padStart(2, '0');
      return \`\${h}:\${m}:\${sec}\`;
    }
  
    function timeStrToSeconds(t) {
      if (!t) return null;
      const parts = t.split(':').map(Number);
      if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
      }
      return null;
    }
  
    // --- Prime Video specific ---
    function getPrimeUITime() {
      const el = document.querySelector('.atvwebplayersdk-timeindicator-text');
      if (!el) return null;
      const text = el.textContent.trim();
      const match = text.match(/^\\d{1,2}:\\d{2}(?::\\d{2})?/);
      return match ? match[0] : null;
    }
  
    // --- Netflix specific ---
    function isNetflix() {
      return !!document.querySelector('.nf-player-container, .VideoContainer, .watch-video');
    }
  
    function isPrimeVideo() {
      return !!document.querySelector('.atvwebplayersdk-timeindicator-text, .PrimeVideo');
    }
  
    function getServiceName() {
      if (isPrimeVideo()) return 'Prime Video';
      if (isNetflix()) return 'Netflix';
      // Fallback: check URL
      const url = window.location.href;
      if (url.includes('primevideo.com')) return 'Prime Video';
      if (url.includes('netflix.com')) return 'Netflix';
      return 'Unknown';
    }
  
    function getVideoTitle(platform) {
      if (platform === 'prime') {
        const el = document.querySelector('.atvwebplayersdk-title-text, .atvwebplayersdk-title-label');
        if (el) return el.textContent.trim();
      } else if (platform === 'netflix') {
        let el = document.querySelector('.video-title, h4[data-uia="video-title"]');
        if (el) return el.textContent.trim();
        el = document.querySelector('.ellipsize-text, .previewModal--player-titleTreatment-logo');
        if (el) return el.textContent.trim();
      }
      return '(Unknown Title)';
    }
  
    // --- Logger attachment ---
    let lastStates = new WeakMap();
    let attachedVideos = new WeakMap();
    let lastTimes = new WeakMap();
  
    // --- Backend logging ---
    function sendLogToBackend(data) {
      const now = new Date();
      const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      const istTimestamp = istTime.toISOString();
      
      const payload = {
        ...data,
        timestamp: istTimestamp
      };
      
      console.log('📤 Sending to backend:', payload);
      
      // Send to React Native bridge
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'VIDEO_LOG',
          data: payload
        }));
      }
    }
  
    function attachLogger(video, platform) {
      if (attachedVideos.has(video)) return;
      attachedVideos.set(video, true);
      lastStates.set(video, null);
      lastTimes.set(video, 0);
      console.log(\`🔍 Attached logger to video (\${platform})\`);
  
      function logEvent(type, seekData = null) {
        let uiTimeStr = null;
        let url = window.location.href;
        const service = getServiceName();
        if (platform === 'prime') {
          const match = url.match(/https:\\/\\/www\\.primevideo\\.com\\/(?:region\\/[a-z]{2}\\/)?detail\\/([A-Z0-9]+)/);
          if (match) {
            url = \`https://www.primevideo.com/detail/\${match[1]}\`;
          }
          uiTimeStr = getPrimeUITime();
          if (seekData) {
            console.log(\`⏭️ Seek from \${formatTime(seekData.from)} to \${formatTime(seekData.to)} | Service: \${service} | URL: \${url}\`);
            sendLogToBackend({ event: 'seek', time: \`\${formatTime(seekData.from)} → \${formatTime(seekData.to)}\`, service, url, seekData });
          } else {
            console.log(\`\${type === 'play' ? '▶️' : '⏸️'} \${type[0].toUpperCase() + type.slice(1)} at UI: \${uiTimeStr || '—'} | Service: \${service} | URL: \${url}\`);
            sendLogToBackend({ event: type, time: uiTimeStr || '—', service, url });
          }
        } else {
          const match = url.match(/^(https:\\/\\/www\\.netflix\\.com\\/watch\\/\\d+)/);
          if (match) url = match[1];
          const ct = video.currentTime;
          if (seekData) {
            console.log(\`⏭️ Seek from \${formatTime(seekData.from)} to \${formatTime(seekData.to)} | Service: \${service} | URL: \${url}\`);
            sendLogToBackend({ event: 'seek', time: \`\${formatTime(seekData.from)} → \${formatTime(seekData.to)}\`, service, url, seekData });
          } else {
            console.log(\`\${type === 'play' ? '▶️' : '⏸️'} \${type[0].toUpperCase() + type.slice(1)} at UI: \${formatTime(ct)} | Service: \${service} | URL: \${url}\`);
            sendLogToBackend({ event: type, time: formatTime(ct), service, url });
          }
        }
      }
  
      video.addEventListener('play', () => {
        const prev = lastStates.get(video);
        if (prev !== 'play') {
          logEvent('play');
          lastStates.set(video, 'play');
        }
      });
      video.addEventListener('pause', () => {
        const prev = lastStates.get(video);
        if (prev !== 'pause') {
          logEvent('pause');
          lastStates.set(video, 'pause');
        }
      });
      video.addEventListener('timeupdate', () => {
        const currentTime = video.currentTime;
        const lastTime = lastTimes.get(video);
        if (lastTime > 0 && Math.abs(currentTime - lastTime) > 1) {
          const seekData = {
            from: lastTime,
            to: currentTime,
            direction: currentTime > lastTime ? 'forward' : 'backward',
            distance: Math.abs(currentTime - lastTime)
          };
          logEvent('seek', seekData);
        }
        lastTimes.set(video, currentTime);
      });
    }
  
    function scanAndAttach() {
      document.querySelectorAll('video').forEach(video => {
        if (isPrimeVideo()) {
          attachLogger(video, 'prime');
        } else if (isNetflix()) {
          attachLogger(video, 'netflix');
        } else {
          attachLogger(video, 'netflix');
        }
      });
    }
  
    // --- Observe DOM changes ---
    const observer = new MutationObserver(scanAndAttach);
    observer.observe(document.body, { childList: true, subtree: true });
    setInterval(scanAndAttach, 1000);
  
    console.log('✅ Merged Netflix/Prime Video logger is active!');
})();`;

export default function VideoPlayer({ roomCode, watchUrl, sessionParam, onVideoLog, username, onSeekRequest }) {
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
              injectedJavaScript={VIDEO_LOGGER_SCRIPT}
              onMessage={async (event) => {
                try {
                  const msg = JSON.parse(event.nativeEvent.data);
                  if (msg.type === 'VIDEO_LOG') {
                    const logData = {
                      ...msg.data,
                      roomCode,
                      username,
                    };
                    await sendVideoLogToBackend(logData);
                  }
                } catch (e) {
                  console.error('Failed to handle WebView message:', e);
                }
              }}
            />
          </View>
          {/* <View style={styles.buttonContainer}>
            <Button 
              title={loading ? "Opening..." : "Open in External Browser"} 
              onPress={handleOpenInBrowser}
              disabled={loading}
            />
          </View> */}
          {/* <ChatPanel
            roomCode={roomCode}
            username={username}
            onSeekRequest={handleSeekFromChat}
          /> */}
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
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { StyleSheet, Platform, StatusBar as RNStatusBar, PermissionsAndroid, BackHandler, View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import FaceAuthScreen from './FaceAuthScreen';

const WEB_URL = 'https://red-onions-cheer.loca.lt';
const Tab = createBottomTabNavigator();

// --- WebView Wrapper Component ---
function WebScreen({ route, navigation }) {
  const { path } = route.params;
  const webviewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [nativeAuthActive, setNativeAuthActive] = useState(false);
  const [authEmail, setAuthEmail] = useState('');

  // Fallback timeout
  useEffect(() => {
    let timeoutId;
    if (loading) {
      timeoutId = setTimeout(() => {
        setLoading(false);
      }, 4000);
    }
    return () => clearTimeout(timeoutId);
  }, [loading]);

  // Trigger haptics on focus
  useFocusEffect(
    useCallback(() => {
      Haptics.selectionAsync();
    }, [])
  );

  // Handle Android hardware back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (webviewRef.current) {
          webviewRef.current.goBack();
          return true;
        }
        return false;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [])
  );

  const INJECTED_JAVASCRIPT = `
    window.isNativeApp = true;
    
    const style = document.createElement('style');
    style.innerHTML = \`
      /* Hide web app's bottom nav as we have native tabs, but keep the header for the hamburger menu! */
      nav.fixed.bottom-0.lg\\\\:hidden { display: none !important; }
      aside { display: none !important; }
      .lg\\\\:ml-64 { margin-left: 0 !important; }

      /* Hide duplicated Sidebar items that are already on the native bottom tab bar */
      [data-nav-id="dashboard"],
      [data-nav-id="workspace"],
      [data-nav-id="meetings"],
      [data-nav-id="employeeCompiler"] {
        display: none !important;
      }
      
      /* Allow text selection in inputs */
      input, textarea {
        -webkit-user-select: auto;
        user-select: auto;
      }
      
      /* Make charts and tables responsive */
      .recharts-wrapper { max-width: 100% !important; height: auto !important; }
    \`;
    document.head.appendChild(style);

    document.addEventListener('click', function(event) {
      try {
        let target = event.target;
        while (target && target.tagName !== 'A') {
          target = target.parentNode;
        }
        if (target && target.hasAttribute('download')) {
          event.preventDefault();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'download',
            url: target.href,
            filename: target.getAttribute('download') || 'download_file'
          }));
        }
      } catch (e) {}
    });

    window.requestNativeScreenshare = function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'request_screenshare' }));
    };

    // Auto-bypass localtunnel reminder page
    try {
      if (document.body.innerText.includes('friendly reminder') || document.body.innerText.includes('LocalTunnel')) {
        const btn = document.querySelector('.btn-primary') || document.querySelector('button');
        if (btn) btn.click();
      }
    } catch(e) {}

    true;
  `;

  const handleMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'download' && data.url && data.filename) {
        const fileUri = FileSystem.documentDirectory + data.filename;
        const downloadRes = await FileSystem.downloadAsync(data.url, fileUri);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadRes.uri);
        }
      } else if (data.type === 'start_face_login' && data.email) {
        setAuthEmail(data.email);
        setNativeAuthActive(true);
      } else if (data.type === 'request_screenshare') {
        alert("Mobile Screen Sharing requires the native Broadcast Extension which is currently being built. Please use a desktop browser to present.");
      }
    } catch (e) {
      console.warn("WebView Message Error:", e);
    }
  };

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline" size={64} color="#64748b" />
          <Text style={styles.errorText}>Cannot connect to server</Text>
          <Text style={styles.retryText} onPress={() => { setError(false); setLoading(true); webviewRef.current?.reload(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>Tap to retry</Text>
        </View>
      ) : (
        <WebView 
          ref={webviewRef}
          source={{ 
            uri: WEB_URL + path,
            headers: { 'Bypass-Tunnel-Reminder': 'true' }
          }} 
          style={[styles.webview, loading && { display: 'none' }]}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={false}
          originWhitelist={['*']}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          injectedJavaScript={INJECTED_JAVASCRIPT}
          onMessage={handleMessage}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
          onPermissionRequest={(event) => {
            event.request.grant();
          }}
          bounces={true}
          overScrollMode="always"
          scrollEnabled={true}
          nestedScrollEnabled={true}
        />
      )}
      
      {loading && !error && !nativeAuthActive && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      )}

      {nativeAuthActive && (
        <View style={styles.nativeAuthOverlay}>
          <FaceAuthScreen 
             email={authEmail}
             onCancel={() => {
               setNativeAuthActive(false);
               webviewRef.current?.injectJavaScript(
                 "document.dispatchEvent(new CustomEvent('nativeMessage', { detail: { type: 'native_face_failed', error: 'Verification cancelled' } })); true;"
               );
             }}
             onSuccess={(data) => {
               setNativeAuthActive(false);
               webviewRef.current?.injectJavaScript(
                 "document.dispatchEvent(new CustomEvent('nativeMessage', { detail: { type: 'native_face_success', data: " + JSON.stringify(data) + " } })); true;"
               );
             }}
             onError={(err) => {
               setNativeAuthActive(false);
               webviewRef.current?.injectJavaScript(
                 "document.dispatchEvent(new CustomEvent('nativeMessage', { detail: { type: 'native_face_failed', error: '" + err + "' } })); true;"
               );
             }}
          />
        </View>
      )}
    </View>
  );
}

// --- Main App Entry ---
export default function App() {
  const [hasPermissions, setHasPermissions] = useState(false);

  useEffect(() => {
    async function requestPermissions() {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);
        setHasPermissions(true);
      } else {
        setHasPermissions(true);
      }
    }
    requestPermissions();
  }, []);

  if (!hasPermissions) return null;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <NavigationContainer>
          <StatusBar style="light" backgroundColor="#020617" />
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarStyle: {
                backgroundColor: '#020617',
                borderTopWidth: 1,
                borderTopColor: 'rgba(255,255,255,0.05)',
                height: Platform.OS === 'ios' ? 85 : 70,
              },
              tabBarActiveTintColor: '#3b82f6',
              tabBarInactiveTintColor: '#64748b',
              tabBarIcon: ({ focused, color, size }) => {
                let iconName;
                if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
                else if (route.name === 'Meetings') iconName = focused ? 'videocam' : 'videocam-outline';
                else if (route.name === 'Drive') iconName = focused ? 'cloud' : 'cloud-outline';
                else if (route.name === 'IDE') iconName = focused ? 'code-slash' : 'code-slash-outline';

                return <Ionicons name={iconName} size={size} color={color} />;
              },
            })}
          >
            <Tab.Screen 
              name="Dashboard" 
              component={WebScreen} 
              initialParams={{ path: '/dashboard' }} 
              listeners={{
                tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
              }}
            />
            <Tab.Screen 
              name="Meetings" 
              component={WebScreen} 
              initialParams={{ path: '/meetings' }} 
              listeners={{
                tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
              }}
            />
            <Tab.Screen 
              name="Drive" 
              component={WebScreen} 
              initialParams={{ path: '/workspace' }} 
              listeners={{
                tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
              }}
            />
            <Tab.Screen 
              name="IDE" 
              component={WebScreen} 
              initialParams={{ path: '/compiler' }} 
              listeners={{
                tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
              }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  centerContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
  },
  errorText: {
    color: '#94a3b8',
    marginTop: 16,
    fontSize: 16,
  },
  retryText: {
    color: '#3b82f6',
    marginTop: 12,
    fontSize: 16,
    fontWeight: 'bold',
  },
  nativeAuthOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#020617',
    zIndex: 9999,
  }
});

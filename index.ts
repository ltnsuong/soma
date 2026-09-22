// MUST be the first import. React Native does not define `localStorage`, and the
// whole client persistence layer — DB.get/DB.save, notifications, the language
// choice — is written against it. Without this the calls sit in bare try/catch
// blocks and silently do nothing, so on a device the app keeps no memory at all:
// every launch starts at the language picker with an empty profile.
//
// This installs a real, synchronous, SQLite-backed `localStorage` global on
// native and is a no-op on web, where the browser's own is already there. It has
// to run before App.tsx is evaluated, hence the bare import above everything.
import 'expo-sqlite/localStorage/install'

import { LogBox } from 'react-native'
import { registerRootComponent } from 'expo'
import App from './App'

// expo-notifications cannot reach the keychain on an UNSIGNED simulator build and
// logs this on every launch. LogBox then covers the whole screen, which makes the
// simulator unusable for testing the app. A signed device build does not hit it,
// and LogBox does not exist in release builds at all, so this only quiets
// development — it hides nothing a user would ever have seen.
LogBox.ignoreLogs(['[expo-notifications] Error reading persisted server registration info'])

registerRootComponent(App)

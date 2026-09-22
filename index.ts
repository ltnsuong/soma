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

import { registerRootComponent } from 'expo'
import App from './App'

registerRootComponent(App)

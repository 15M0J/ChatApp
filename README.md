# ChatApp

ChatApp is a production-style Expo React Native chat app built for the HNG Stage 5 mobile task. It covers the core behaviors expected from a modern 1:1 messenger: realtime conversations, media messages, read receipts, in-chat search, typing presence, offline text sends, and Firebase-backed auth/storage.

## Highlights

- Realtime 1:1 chat powered by Firebase Auth, Firestore, and Storage.
- Offline-first text sending with a persisted Zustand queue that flushes after reconnect.
- Rich message types: text, audio, compressed images, compressed videos, and generated thumbnails.
- Messenger interactions: typing indicators, emoji reactions, edit/delete actions, and Sent/Delivered/Seen receipts.
- Search-focused UX with user lookup, in-chat search, highlighted matches, loading states, empty states, and error recovery.
- Native media permissions configured for Android and iOS through Expo plugins.

## Stack

- Expo SDK 55
- React Native 0.83 + React 19
- TypeScript
- Firebase Auth, Firestore, and Storage
- Zustand with AsyncStorage persistence
- Expo Audio, Image Picker, Image Manipulator, Video, and Video Thumbnails
- react-native-compressor for video compression

## App Features

- Email/password registration and login
- User profile creation with searchable email/display-name tokens
- New chat flow with user search
- Realtime conversation list and message stream
- Typing indicator with animated dots
- Long-press emoji reactions
- Audio recording, playback, and 1x/2x speed toggle
- Image and video message picking, compression, upload progress states, thumbnails, and fullscreen viewer
- Message receipts: Sent, Delivered, Seen
- In-chat search with highlighted matches and no-results feedback
- Edit messages
- Delete for me and delete for everyone
- Persisted offline text queue
- Loading, empty, error, and reload states across async screens

## Project Structure

```text
src/
  components/        Reusable chat UI, media, audio, and async-state components
  screens/           Auth, conversation list, new chat, and chat screens
  services/          Firebase auth, Firestore, Storage, media, and chat operations
  store/             Zustand session/navigation/offline queue state
  utils/             Search-token generation and friendly error formatting
  firebase.ts        Firebase app, auth, Firestore, and Storage initialization
  types.ts           Shared app data types
```

## Firebase Setup

Create a Firebase project and enable:

1. Authentication with the Email/Password provider
2. Firestore Database
3. Firebase Storage

Then update the Firebase values in `app.json` under `expo.extra`:

```json
{
  "firebaseApiKey": "YOUR_API_KEY",
  "firebaseAuthDomain": "YOUR_PROJECT.firebaseapp.com",
  "firebaseProjectId": "YOUR_PROJECT_ID",
  "firebaseStorageBucket": "YOUR_PROJECT.firebasestorage.app",
  "firebaseMessagingSenderId": "YOUR_SENDER_ID",
  "firebaseAppId": "YOUR_APP_ID"
}
```

Deploy the included Firestore and Storage rules before testing with real users:

```bash
firebase deploy --only firestore:rules,storage
```

This repo includes:

- `firestore.rules`
- `storage.rules`
- `firestore.indexes.json`
- `firebase.json`

## Run Locally

Install dependencies:

```bash
npm install
```

Start the Expo dev server:

```bash
npm start
```

Run a native Android build when validating audio recording, media picking, video compression, and native permissions:

```bash
npm run android
```

Run TypeScript validation:

```bash
npm run typecheck
```

Create a web export:

```bash
npm run build
```

## Demo Script

Use two signed-in users on two physical devices or emulators.

1. Register or sign in as both users.
2. Search for the second user by email or display name.
3. Create a new chat.
4. Send a text message while online.
5. Turn one device offline, send a text message, reconnect, and confirm the queued message flushes.
6. Show the typing indicator from the other device.
7. Long-press a message and add an emoji reaction.
8. Record and play an audio message, then switch playback to 2x.
9. Pick an image and a video, then show compression/upload states, thumbnails, and fullscreen viewing.
10. Show receipt progression from Sent to Delivered to Seen.
11. Search within the chat and show highlighted matches plus the no-results state.
12. Edit your own message.
13. Delete a message for yourself.
14. Delete a message for everyone.

## Notes

- Firebase web app config values are used by the client app and should be replaced with the config for your own Firebase project.
- Media features should be tested in a development build because Expo Go may not match the final native permission and compression behavior.
- The app currently focuses on 1:1 conversations, not group chats.

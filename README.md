# ChatApp

Expo React Native + TypeScript chat app for the HNG Stage 5 mobile task.

## Stack

- Expo SDK 55
- React Native + TypeScript
- Firebase Auth, Firestore, Storage
- Zustand state management with persisted offline send queue

## Features

- Email/password auth and user profile creation
- New chat flow with user search by email or display name
- Realtime 1:1 conversations
- Typing indicator with animated dots
- Emoji reactions on long press
- Audio recording, playback, and 1x/2x playback speed
- Image and video messages with client-side compression, thumbnails, and fullscreen viewer
- Read receipts: Sent, Delivered, Seen
- In-chat search with loading, highlighted matches, empty and no-results states
- Edit/delete messages, including delete-for-me and delete-for-everyone
- Offline text send queue that persists and flushes on reconnect
- Loading, error, empty, and reload states on async screens

## Firebase Setup

Create your own Firebase project. Enable:

1. Authentication -> Email/Password
2. Firestore Database
3. Storage

Replace the placeholder values in `app.json` under `expo.extra` with your own Firebase web app config.

Deploy rules:

```bash
firebase deploy --only firestore:rules,storage
```

Use `firestore.rules` and `storage.rules` from this repo.

## Run

```bash
npm install
npm start
```

For native media recording/compression validation, use a development build:

```bash
npm run android
```

## Demo Checklist

- Show two signed-in users on two devices/emulators.
- Create a new chat from search.
- Send text while offline, reconnect, and show delivery.
- Show typing indicator.
- Long-press and add an emoji reaction.
- Record and play an audio message, then toggle 2x speed.
- Pick image and video messages, show compression/upload state, thumbnails, and fullscreen viewer.
- Show Sent -> Delivered -> Seen.
- Search inside the chat and show highlight/no-results.
- Edit your own message, delete for me, and delete for everyone.

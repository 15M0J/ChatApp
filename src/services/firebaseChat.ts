import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import { Video as VideoCompressor } from "react-native-compressor";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User
} from "firebase/auth";
import {
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "../firebase";
import type { ChatMessage, Conversation, MessageType, PendingOutboundMessage, ReceiptStatus, UserProfile } from "../types";
import { buildSearchTokens, normalizeTerm } from "../utils/searchTokens";

function fromMillis(value: unknown) {
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }
  return typeof value === "number" ? value : undefined;
}

function mapUser(uid: string, data: Record<string, unknown>): UserProfile {
  const email = String(data.email ?? "");
  const displayName = String(data.displayName ?? email.split("@")[0] ?? "User");
  return {
    uid,
    email,
    emailLower: String(data.emailLower ?? email.toLowerCase()),
    displayName,
    searchTokens: Array.isArray(data.searchTokens) ? (data.searchTokens as string[]) : buildSearchTokens(email, displayName)
  };
}

function mapConversation(id: string, data: Record<string, unknown>): Conversation {
  return {
    id,
    members: (data.members as string[]) ?? [],
    memberInfo: (data.memberInfo as Conversation["memberInfo"]) ?? {},
    typing: (data.typing as Record<string, boolean>) ?? {},
    lastMessageText: data.lastMessageText ? String(data.lastMessageText) : undefined,
    lastMessageAt: fromMillis(data.lastMessageAt),
    createdAt: fromMillis(data.createdAt),
    updatedAt: fromMillis(data.updatedAt)
  };
}

function mapMessage(id: string, conversationId: string, data: Record<string, unknown>): ChatMessage {
  return {
    id,
    conversationId,
    senderId: String(data.senderId ?? ""),
    senderName: String(data.senderName ?? "User"),
    type: (data.type as MessageType) ?? "text",
    text: typeof data.text === "string" ? data.text : null,
    mediaUrl: typeof data.mediaUrl === "string" ? data.mediaUrl : undefined,
    thumbnailUrl: typeof data.thumbnailUrl === "string" ? data.thumbnailUrl : undefined,
    durationMillis: typeof data.durationMillis === "number" ? data.durationMillis : undefined,
    fileName: typeof data.fileName === "string" ? data.fileName : undefined,
    statusByUser: (data.statusByUser as Record<string, ReceiptStatus>) ?? {},
    reactions: (data.reactions as Record<string, string>) ?? {},
    deletedFor: (data.deletedFor as string[]) ?? [],
    deletedForEveryone: Boolean(data.deletedForEveryone),
    editedAt: fromMillis(data.editedAt),
    createdAt: fromMillis(data.createdAt),
    updatedAt: fromMillis(data.updatedAt)
  };
}

export function listenAuth(callback: (profile: UserProfile | null) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null);
      return;
    }
    callback(await ensureUserProfile(user));
  });
}

export async function ensureUserProfile(user: User, displayName?: string) {
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);
  const fallbackName = displayName || user.displayName || user.email?.split("@")[0] || "User";
  const email = user.email ?? "";

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email,
      emailLower: email.toLowerCase(),
      displayName: fallbackName,
      searchTokens: buildSearchTokens(email, fallbackName),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return mapUser(user.uid, { email, displayName: fallbackName });
  }

  return mapUser(user.uid, snapshot.data());
}

export async function registerUser(email: string, password: string, displayName: string) {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(credential.user, { displayName: displayName.trim() });
  return ensureUserProfile(credential.user, displayName.trim());
}

export async function loginUser(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return ensureUserProfile(credential.user);
}

export async function logoutUser() {
  await signOut(auth);
}

export function listenConversations(uid: string, onNext: (items: Conversation[]) => void, onError: (error: Error) => void) {
  const conversationsQuery = query(collection(db, "conversations"), where("members", "array-contains", uid), orderBy("updatedAt", "desc"));
  return onSnapshot(
    conversationsQuery,
    (snapshot) => onNext(snapshot.docs.map((item) => mapConversation(item.id, item.data()))),
    onError
  );
}

export function listenMessages(
  conversationId: string,
  currentUid: string,
  onNext: (items: ChatMessage[]) => void,
  onError: (error: Error) => void
) {
  const messagesQuery = query(collection(db, "conversations", conversationId, "messages"), orderBy("createdAt", "asc"), limit(150));
  return onSnapshot(
    messagesQuery,
    async (snapshot) => {
      const messages = snapshot.docs
        .map((item) => mapMessage(item.id, conversationId, item.data()))
        .filter((message) => !message.deletedFor?.includes(currentUid));
      onNext(messages);
      await markMessages(conversationId, currentUid, messages, "seen");
    },
    onError
  );
}

export async function markMessages(conversationId: string, currentUid: string, messages: ChatMessage[], status: ReceiptStatus) {
  const batch = writeBatch(db);
  let count = 0;

  messages.forEach((message) => {
    if (message.senderId === currentUid) return;
    if (message.statusByUser?.[currentUid] === status) return;
    batch.update(doc(db, "conversations", conversationId, "messages", message.id), {
      [`statusByUser.${currentUid}`]: status,
      updatedAt: serverTimestamp()
    });
    count += 1;
  });

  if (count > 0) {
    await batch.commit();
  }
}

export async function searchUsers(term: string, currentUid: string) {
  const normalized = normalizeTerm(term);
  if (!normalized) return [];
  const usersQuery = query(collection(db, "users"), where("searchTokens", "array-contains", normalized), limit(15));
  const snapshot = await getDocs(usersQuery);
  return snapshot.docs.map((item) => mapUser(item.id, item.data())).filter((profile) => profile.uid !== currentUid);
}

export async function createConversation(currentUser: UserProfile, otherUser: UserProfile) {
  const members = [currentUser.uid, otherUser.uid].sort();
  const id = members.join("_");
  const conversationRef = doc(db, "conversations", id);
  const existing = await getDoc(conversationRef);

  if (!existing.exists()) {
    await setDoc(conversationRef, {
      members,
      memberInfo: {
        [currentUser.uid]: {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName
        },
        [otherUser.uid]: {
          uid: otherUser.uid,
          email: otherUser.email,
          displayName: otherUser.displayName
        }
      },
      typing: {},
      lastMessageText: "New chat",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessageAt: serverTimestamp()
    });
  }

  return id;
}

export async function sendTextNow(message: PendingOutboundMessage, members: string[]) {
  const messageRef = doc(db, "conversations", message.conversationId, "messages", message.clientId);
  const statusByUser = members.reduce<Record<string, ReceiptStatus>>((acc, uid) => {
    acc[uid] = uid === message.senderId ? "seen" : "sent";
    return acc;
  }, {});

  await setDoc(messageRef, {
    conversationId: message.conversationId,
    senderId: message.senderId,
    senderName: message.senderName,
    type: "text",
    text: message.text,
    statusByUser,
    reactions: {},
    deletedFor: [],
    deletedForEveryone: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  await updateConversationLastMessage(message.conversationId, message.text);
}

export async function updateTypingStatus(conversationId: string, uid: string, isTyping: boolean) {
  await updateDoc(doc(db, "conversations", conversationId), {
    [`typing.${uid}`]: isTyping,
    updatedAt: serverTimestamp()
  });
}

export async function setReaction(conversationId: string, messageId: string, uid: string, emoji: string | null) {
  await updateDoc(doc(db, "conversations", conversationId, "messages", messageId), {
    [`reactions.${uid}`]: emoji ?? deleteField(),
    updatedAt: serverTimestamp()
  });
}

export async function editMessage(conversationId: string, messageId: string, text: string) {
  await updateDoc(doc(db, "conversations", conversationId, "messages", messageId), {
    text,
    editedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function deleteMessageForMe(conversationId: string, messageId: string, uid: string) {
  await updateDoc(doc(db, "conversations", conversationId, "messages", messageId), {
    deletedFor: arrayUnion(uid),
    updatedAt: serverTimestamp()
  });
}

export async function deleteMessageForEveryone(conversationId: string, messageId: string) {
  await updateDoc(doc(db, "conversations", conversationId, "messages", messageId), {
    text: null,
    deletedForEveryone: true,
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function pickAndSendMedia(conversation: Conversation, currentUser: UserProfile) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Gallery permission is required to send media.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All,
    quality: 1,
    videoMaxDuration: 60
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const isVideo = asset.type === "video";
  const processed = isVideo ? await compressVideo(asset.uri) : await compressImage(asset.uri);
  const thumbnail = isVideo ? await createVideoThumbnail(processed.uri) : processed.uri;
  const messageId = `${Date.now()}_${currentUser.uid}`;
  const mediaUrl = await uploadLocalUri(conversation.id, messageId, processed.uri, processed.contentType);
  const thumbnailUrl = thumbnail ? await uploadLocalUri(conversation.id, `${messageId}_thumb`, thumbnail, "image/jpeg") : undefined;

  await sendMediaMessage({
    conversation,
    currentUser,
    messageId,
    type: isVideo ? "video" : "image",
    mediaUrl,
    thumbnailUrl,
    durationMillis: asset.duration ?? undefined
  });

  return messageId;
}

export async function sendAudioMessage(conversation: Conversation, currentUser: UserProfile, uri: string, durationMillis?: number) {
  const messageId = `${Date.now()}_${currentUser.uid}_audio`;
  const mediaUrl = await uploadLocalUri(conversation.id, messageId, uri, "audio/m4a");
  await sendMediaMessage({
    conversation,
    currentUser,
    messageId,
    type: "audio",
    mediaUrl,
    durationMillis
  });
}

async function sendMediaMessage(input: {
  conversation: Conversation;
  currentUser: UserProfile;
  messageId: string;
  type: MessageType;
  mediaUrl: string;
  thumbnailUrl?: string;
  durationMillis?: number;
}) {
  const statusByUser = input.conversation.members.reduce<Record<string, ReceiptStatus>>((acc, uid) => {
    acc[uid] = uid === input.currentUser.uid ? "seen" : "sent";
    return acc;
  }, {});
  const messageText = input.type === "audio" ? "Audio message" : input.type === "video" ? "Video message" : "Image message";

  await setDoc(doc(db, "conversations", input.conversation.id, "messages", input.messageId), {
    conversationId: input.conversation.id,
    senderId: input.currentUser.uid,
    senderName: input.currentUser.displayName,
    type: input.type,
    text: messageText,
    mediaUrl: input.mediaUrl,
    thumbnailUrl: input.thumbnailUrl ?? null,
    durationMillis: input.durationMillis ?? null,
    statusByUser,
    reactions: {},
    deletedFor: [],
    deletedForEveryone: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  await updateConversationLastMessage(input.conversation.id, messageText);
}

async function compressImage(uri: string) {
  const result = await manipulateAsync(uri, [{ resize: { width: 1440 } }], {
    compress: 0.72,
    format: SaveFormat.JPEG
  });
  return { uri: result.uri, contentType: "image/jpeg" };
}

async function compressVideo(uri: string) {
  const compressedUri = await VideoCompressor.compress(uri, {
    compressionMethod: "auto"
  });
  return { uri: compressedUri, contentType: "video/mp4" };
}

async function createVideoThumbnail(uri: string) {
  const result = await VideoThumbnails.getThumbnailAsync(uri, {
    time: 500,
    quality: 0.65
  });
  return result.uri;
}

async function uploadLocalUri(conversationId: string, fileName: string, uri: string, contentType: string) {
  const blob = await new Promise<Blob>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error("Unable to read local file for upload."));
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send(null);
  });

  const mediaRef = ref(storage, `chatMedia/${conversationId}/${fileName}`);
  await uploadBytes(mediaRef, blob, { contentType });
  return getDownloadURL(mediaRef);
}

async function updateConversationLastMessage(conversationId: string, text: string) {
  await updateDoc(doc(db, "conversations", conversationId), {
    lastMessageText: text,
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export type Screen = "auth" | "conversations" | "newChat" | "chat";

export type MessageType = "text" | "audio" | "image" | "video";
export type ReceiptStatus = "sent" | "delivered" | "seen";

export type UserProfile = {
  uid: string;
  email: string;
  emailLower: string;
  displayName: string;
  searchTokens: string[];
};

export type Conversation = {
  id: string;
  members: string[];
  memberInfo: Record<string, Pick<UserProfile, "uid" | "email" | "displayName">>;
  lastMessageText?: string;
  lastMessageAt?: number;
  typing?: Record<string, boolean>;
  createdAt?: number;
  updatedAt?: number;
  isDraft?: boolean;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  type: MessageType;
  text?: string | null;
  mediaUrl?: string;
  thumbnailUrl?: string;
  durationMillis?: number;
  fileName?: string;
  statusByUser?: Record<string, ReceiptStatus>;
  reactions?: Record<string, string>;
  deletedFor?: string[];
  deletedForEveryone?: boolean;
  editedAt?: number;
  createdAt?: number;
  updatedAt?: number;
  localState?: "queued" | "sending" | "failed";
};

export type PendingOutboundMessage = {
  clientId: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  queuedAt: number;
};

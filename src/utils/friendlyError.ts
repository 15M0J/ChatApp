const AUTH_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/user-not-found": "No account found with this email.",
  "auth/email-already-in-use": "An account already exists with this email.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/network-request-failed": "No internet connection. Please check your network.",
  "auth/requires-recent-login": "Please sign out and sign in again to continue.",
  "auth/operation-not-allowed": "This sign-in method is not enabled."
};

const FIRESTORE_MESSAGES: Record<string, string> = {
  "permission-denied": "You don't have access to this data.",
  "not-found": "The requested content could not be found.",
  "failed-precondition": "Something isn't ready yet. Please try again in a moment.",
  "unavailable": "Service is temporarily unavailable. Check your connection.",
  "deadline-exceeded": "The request timed out. Please try again.",
  "resource-exhausted": "Too many requests. Please slow down.",
  "unauthenticated": "You need to be signed in to do that.",
  "already-exists": "This already exists.",
  "aborted": "The operation was interrupted. Please try again.",
  "cancelled": "The operation was cancelled."
};

export function friendlyError(err: unknown): string {
  if (!(err instanceof Error)) return "Something went wrong. Please try again.";

  const message = err.message ?? "";

  // Firebase Auth errors carry a code property
  const code = (err as { code?: string }).code ?? "";

  if (code && AUTH_MESSAGES[code]) return AUTH_MESSAGES[code];

  // Firestore errors: code is like "firestore/permission-denied" or just "permission-denied"
  const firestoreKey = code.replace("firestore/", "");
  if (firestoreKey && FIRESTORE_MESSAGES[firestoreKey]) return FIRESTORE_MESSAGES[firestoreKey];

  // Firestore errors sometimes surface only in the message string
  if (message.includes("requires an index") || message.includes("FAILED_PRECONDITION")) {
    return "Something isn't ready yet. Please try again in a moment.";
  }
  if (message.includes("permission") || message.includes("PERMISSION_DENIED")) {
    return "You don't have access to this data.";
  }
  if (message.includes("network") || message.includes("UNAVAILABLE")) {
    return "No internet connection. Please check your network.";
  }
  if (message.includes("timeout") || message.includes("DEADLINE_EXCEEDED")) {
    return "The request timed out. Please try again.";
  }

  return "Something went wrong. Please try again.";
}

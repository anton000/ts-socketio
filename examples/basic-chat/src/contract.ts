import { defineSocketContract, z } from '@ts-socketio/core';

// --- Custom Metadata Schema (Optional) ---
const CustomMetadataSchema = z.object({
  authToken: z.string().optional(),
  // Can add more custom fields if needed
});

// --- Schemas ---

// User schemas
const NicknamePayloadSchema = z.object({ 
  nickname: z.string().min(1).max(20) 
});

const NicknameResponseSchema = z.object({ 
  success: z.boolean(), 
  message: z.string(), 
  assignedNickname: z.string().optional() 
});

// Chat message schemas
const ChatMessagePayloadSchema = z.object({ 
  text: z.string().min(1) 
});

const ChatMessageSchema = ChatMessagePayloadSchema.extend({
  senderId: z.string().optional(),
  senderNickname: z.string().optional()
});

// Notification schemas
const UserNotificationPayloadSchema = z.object({ 
  userId: z.string(), 
  nickname: z.string(), 
  message: z.string() 
});

// Typing indicator schema
const TypingPayloadSchema = z.object({ 
  isTyping: z.boolean() 
});

// Typing event with user info for broadcasting
const TypingStatusSchema = z.object({
  userId: z.string(),
  nickname: z.string(),
  isTyping: z.boolean()
});

export const NotificationPayloadSchema = z.object({
  type: z.string(),
  message: z.string(),
});

// --- Contract Definition (Pass Metadata Schema in Options) ---
export const chatContract = defineSocketContract({
  // Client -> Server Events
  Client: {
    // Set nickname (with acknowledgement/response)
    setNickname: {
      payload: NicknamePayloadSchema,
      response: NicknameResponseSchema
    },
    // Typing indicator (fire-and-forget)
    typing: {
      payload: TypingPayloadSchema
      // No response defined - fire and forget
    }
  },

  // Server -> Client Events
  Server: {
    // System notifications
    userNotification: {
      payload: UserNotificationPayloadSchema
    },
    // Typing status notification
    typingStatus: {
      payload: TypingStatusSchema
    },
    notification: {
      payload: NotificationPayloadSchema
    }
  },

  // Shared / Bidirectional Events
  sendMessage: {
    // Sent by clients, broadcast by server
    payload: ChatMessageSchema
    // No response defined
  }
}, {
  // Pass the custom metadata schema here
  metadataSchema: CustomMetadataSchema 
});

// Export types for convenience
export type ChatContractType = typeof chatContract;
// Export the inferred custom metadata type
export type CustomMetadata = z.infer<typeof CustomMetadataSchema>;
// Optional: Export the raw definition type if needed elsewhere
export type ChatContractDef = typeof chatContract.definition; 
import { defineSocketContract, z } from '@ts-socketio/core';

// --- Add Custom Metadata Schema (Optional but needed for example) ---
const CustomMetadataSchema = z.object({
  authToken: z.string().optional(),
  traceId: z.string().optional(), // Example field from outline
});

// Schemas (same as basic-chat example)
const NicknamePayloadSchema = z.object({ nickname: z.string().min(1).max(20) });
const NicknameResponseSchema = z.object({ success: z.boolean(), message: z.string(), assignedNickname: z.string().optional() });
const ChatMessagePayloadSchema = z.object({ text: z.string().min(1) });
const ChatMessageSchema = ChatMessagePayloadSchema.extend({
  senderId: z.string().optional(),
  senderNickname: z.string().optional()
});
const UserNotificationPayloadSchema = z.object({ userId: z.string(), nickname: z.string(), message: z.string() });
const TypingPayloadSchema = z.object({ isTyping: z.boolean() });
const TypingStatusSchema = z.object({ userId: z.string(), nickname: z.string(), isTyping: z.boolean() });

export const NotificationPayloadSchema = z.object({
  type: z.string(),
  message: z.string(),
});

// Contract Definition
export const chatContract = defineSocketContract({
  Client: {
    setNickname: {
      payload: NicknamePayloadSchema,
      response: NicknameResponseSchema
    },
    typing: {
      payload: TypingPayloadSchema
    }
  },
  Server: {
    userNotification: {
      payload: UserNotificationPayloadSchema
    },
    typingStatus: {
      payload: TypingStatusSchema
    },
    notification: {
      payload: NotificationPayloadSchema
    }
  },
  sendMessage: {
    payload: ChatMessageSchema
  }
}, {
  // --- Pass the custom metadata schema in options ---
  metadataSchema: CustomMetadataSchema 
});

// Export the processed contract type
export type ChatContractType = typeof chatContract;

// --- Export the inferred Custom Metadata type ---
export type CustomMetadata = z.infer<typeof CustomMetadataSchema>;
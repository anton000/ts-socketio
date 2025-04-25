import { defineSocketContract, z } from '@ts-socketio/core';

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
    }
  },
  sendMessage: {
    payload: ChatMessageSchema
  }
});

// Export the processed contract type
export type ChatContractType = typeof chatContract;
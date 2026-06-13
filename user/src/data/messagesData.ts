import { Artist } from "@/data/mockData";

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
  isRead: boolean;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

// Mock conversations
export const mockConversations: Conversation[] = [
  {
    id: "conv-1",
    participantId: "a1",
    participantName: "Elena Vasquez",
    participantAvatar: "https://i.pravatar.cc/150?img=1",
    lastMessage: "I'd be happy to discuss a custom piece!",
    lastMessageTime: "2 hours ago",
    unreadCount: 1,
  },
];

// Mock messages for a conversation
export const mockMessages: Record<string, Message[]> = {
  "conv-1": [
    {
      id: "m1",
      senderId: "u1",
      receiverId: "a1",
      text: "Hi! I love your abstract work. Can you create a custom piece for my living room?",
      timestamp: "10:30 AM",
      isRead: true,
    },
    {
      id: "m2",
      senderId: "a1",
      receiverId: "u1",
      text: "Thank you so much! I'd be happy to discuss a custom piece!",
      timestamp: "10:45 AM",
      isRead: false,
    },
  ],
};

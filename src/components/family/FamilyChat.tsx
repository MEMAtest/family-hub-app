'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FamilyMember, FamilyMessage } from '@/types/family.types';
import {
  Send,
  Smile,
  Paperclip,
  Phone,
  Video,
  MoreVertical,
  Search,
  Users,
  Bell,
  BellOff,
  Image,
  File,
  MessageSquare,
  Calendar,
  MapPin,
  Heart,
  Camera,
  Mic,
  X
} from 'lucide-react';

interface FamilyChatProps {
  familyMembers: FamilyMember[];
  currentUserId: string;
  onSendMessage: (message: Partial<FamilyMessage>) => void;
  messages: FamilyMessage[];
}

export const FamilyChat: React.FC<FamilyChatProps> = ({
  familyMembers,
  currentUserId,
  onSendMessage,
  messages: initialMessages
}) => {
  const [messages, setMessages] = useState<any[]>(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<string>('all');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState<string[]>([]);
  const [attachmentType, setAttachmentType] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const mockMessages: any[] = [
    {
      id: '1',
      fromMemberId: 'ade',
      toMemberIds: ['angela', 'askia', 'amari'],
      content: 'Good morning everyone! Hope you all have a great day 😊',
      type: 'text',
      priority: 'low',
      attachments: [],
      replies: [],
      createdAt: new Date('2024-01-15T08:00:00'),
      isRead: { 'ade': true, 'angela': true, 'askia': false },
      reactions: [
        { memberId: 'angela', type: 'love', createdAt: new Date() },
        { memberId: 'askia', type: 'like', createdAt: new Date() }
      ]
    },
    {
      id: '2',
      senderId: 'angela',
      recipientId: 'all',
      content: 'Thanks honey! Don\'t forget we have Askia\'s soccer game at 3 PM today',
      timestamp: new Date('2024-01-15T08:15:00').toISOString(),
      type: 'text',
      isRead: { 'ade': true, 'angela': true, 'askia': false },
      reactions: [
        { memberId: 'ade', type: 'like', createdAt: new Date() }
      ]
    },
    {
      id: '3',
      senderId: 'askia',
      recipientId: 'all',
      content: 'Can someone pick me up from practice? It ends at 5:30',
      timestamp: new Date('2024-01-15T14:30:00').toISOString(),
      type: 'text',
      isRead: true
    },
    {
      id: '4',
      senderId: 'ade',
      recipientId: 'askia',
      content: 'I\'ll pick you up! See you at 5:30 sharp 🚗',
      timestamp: new Date('2024-01-15T14:32:00').toISOString(),
      type: 'text',
      isRead: { 'ade': true, 'angela': true, 'askia': false },
      reactions: [
        { memberId: 'askia', type: 'love', createdAt: new Date() }
      ]
    },
    {
      id: '5',
      senderId: 'amari',
      recipientId: 'all',
      content: 'Mom, can you help me with my math homework later?',
      timestamp: new Date('2024-01-15T16:00:00').toISOString(),
      type: 'text',
      isRead: { 'ade': false, 'angela': false, 'askia': false }
    },
    {
      id: '6',
      senderId: 'angela',
      recipientId: 'all',
      content: 'Family movie night tonight! I\'m making popcorn 🍿',
      timestamp: new Date('2024-01-15T18:00:00').toISOString(),
      type: 'text',
      isRead: { 'ade': false, 'angela': false, 'askia': false },
      reactions: [
        { memberId: 'amari', type: 'wow', createdAt: new Date() },
        { memberId: 'askia', type: 'like', createdAt: new Date() }
      ]
    }
  ];

  useEffect(() => {
    if (messages.length === 0) {
      setMessages(mockMessages);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message: any = {
      id: Date.now().toString(),
      senderId: currentUserId,
      recipientId: selectedRecipient,
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      type: 'text',
      isRead: { 'ade': false, 'angela': false, 'askia': false }
    };

    setMessages(prev => [...prev, message as FamilyMessage]);
    onSendMessage(message);
    setNewMessage('');
    setShowEmojiPicker(false);
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    chatInputRef.current?.focus();
  };

  const handleReaction = (messageId: string, emoji: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const reactions = [...(msg.reactions || [])];
        const existingReactionIndex = reactions.findIndex(r => r.memberId === currentUserId);

        if (existingReactionIndex >= 0) {
          reactions.splice(existingReactionIndex, 1);
        } else {
          reactions.push({ memberId: currentUserId, type: 'like', createdAt: new Date() });
        }

        return { ...msg, reactions };
      }
      return msg;
    }));
  };

  const getMemberById = (id: string) => {
    return familyMembers.find(member => member.id === id);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const quickEmojis = ['❤️', '👍', '😊', '😂', '🎉', '🙏', '👏', '🔥'];
  const quickActions = [
    { icon: Calendar, label: 'Share Event', color: 'blue' },
    { icon: MapPin, label: 'Share Location', color: 'green' },
    { icon: Image, label: 'Send Photo', color: 'purple' },
    { icon: File, label: 'Send File', color: 'orange' }
  ];

  const groupedMessages = messages.reduce((groups: { [key: string]: any[] }, message) => {
    const date = formatDate((message as any).timestamp);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-96 flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Family Chat</h3>
              <p className="text-sm text-gray-600">
                {familyMembers.length} members • {isTyping.length > 0 ? `${isTyping.join(', ')} typing...` : 'Active now'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Search className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Phone className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Video className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">To:</label>
          <select
            value={selectedRecipient}
            onChange={(e) => setSelectedRecipient(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Everyone</option>
            {familyMembers
              .filter(member => member.id !== currentUserId)
              .map(member => (
                <option key={member.id} value={member.id}>
                  {member.firstName} {member.lastName}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            <div className="flex items-center justify-center mb-4">
              <span className="px-3 py-1 bg-gray-200 text-gray-600 text-xs font-medium rounded-full">
                {date}
              </span>
            </div>

            {dateMessages.map((message) => {
              const sender = getMemberById((message as any).senderId);
              const isOwnMessage = (message as any).senderId === currentUserId;

              return (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                >
                  {!isOwnMessage && (
                    <div className="flex-shrink-0">
                      {sender?.profilePhoto ? (
                        <img
                          src={sender.profilePhoto}
                          alt={`${sender.firstName} ${sender.lastName}`}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            {sender?.firstName?.[0]}{sender?.lastName?.[0]}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`flex-1 max-w-xs ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                    <div
                      className={`inline-block px-4 py-2 rounded-2xl ${
                        isOwnMessage
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">
                        {formatTime((message as any).timestamp)}
                      </span>
                      {message.isRead && isOwnMessage && (
                        <span className="text-xs text-blue-500">Read</span>
                      )}
                    </div>

                    {message.reactions && message.reactions.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {message.reactions.map((reaction: any, index: number) => (
                          <button
                            key={index}
                            onClick={() => handleReaction(message.id, 'like')}
                            className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-full text-xs hover:bg-gray-50 transition-colors"
                          >
                            <span>{reaction.type === 'love' ? '❤️' : reaction.type === 'like' ? '👍' : reaction.type === 'wow' ? '😮' : '👍'}</span>
                            <span className="text-gray-600">1</span>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {quickEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(message.id, emoji)}
                          className="text-sm hover:scale-110 transition-transform"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {attachmentType && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Quick Actions</h4>
            <button
              onClick={() => setAttachmentType(null)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action) => {
              const IconComponent = action.icon;
              return (
                <button
                  key={action.label}
                  className={`flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-${action.color}-50 hover:border-${action.color}-200 transition-colors`}
                >
                  <IconComponent className={`w-5 h-5 text-${action.color}-600`} />
                  <span className="text-sm font-medium text-gray-900">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAttachmentType(attachmentType ? null : 'actions')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsRecording(!isRecording)}
            className={`p-2 rounded-lg transition-colors ${
              isRecording
                ? 'bg-red-100 text-red-600'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Mic className="w-4 h-4" />
          </button>

          <div className="flex-1 relative">
            <input
              ref={chatInputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={isRecording ? 'Recording voice message...' : 'Type a message...'}
              disabled={isRecording}
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            />

            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <Smile className="w-4 h-4" />
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-2 p-3 bg-white border border-gray-200 rounded-lg shadow-lg">
                <div className="grid grid-cols-4 gap-2">
                  {quickEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleEmojiSelect(emoji)}
                      className="p-2 text-lg hover:bg-gray-100 rounded transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!newMessage.trim() && !isRecording}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
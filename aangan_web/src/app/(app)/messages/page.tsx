'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useMessageStore } from '@/stores/messageStore';
import { useFamilyStore } from '@/stores/familyStore';
import { useAuthStore } from '@/stores/authStore';
import AvatarCircle from '@/components/ui/AvatarCircle';
import GoldButton from '@/components/ui/GoldButton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { timeAgo } from '@/lib/utils/formatters';
import { VALIDATION } from '@/lib/constants';
import { cn } from '@/lib/utils/cn';

export default function MessagesPage() {
  const {
    conversations,
    messages,
    totalUnread,
    isLoading,
    fetchConversations,
    fetchMessages,
    sendMessage,
    markRead,
  } = useMessageStore();

  const { members, fetchMembers } = useFamilyStore();
  const { user } = useAuthStore();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedUserId) {
      fetchMessages(selectedUserId);
      markRead(selectedUserId);
    }
  }, [selectedUserId, fetchMessages, markRead]);

  // Scroll to bottom when messages change
  const currentMessages = selectedUserId ? messages[selectedUserId] || [] : [];
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages.length]);

  const handleSend = useCallback(async () => {
    if (!selectedUserId || !messageText.trim() || sending) return;
    const text = messageText.trim();
    if (text.length > VALIDATION.maxMessageLength) return;

    setSending(true);
    setMessageText('');
    await sendMessage(selectedUserId, text);
    setSending(false);
  }, [selectedUserId, messageText, sending, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleSelectConversation = useCallback((userId: string) => {
    setSelectedUserId(userId);
    setShowNewChat(false);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedUserId(null);
  }, []);

  const handleNewChat = useCallback(() => {
    fetchMembers();
    setShowNewChat(true);
  }, [fetchMembers]);

  const handleSelectNewChatUser = useCallback(
    (userId: string) => {
      setSelectedUserId(userId);
      setShowNewChat(false);
      fetchMessages(userId);
    },
    [fetchMessages]
  );

  // Get selected user info
  const selectedConversation = conversations.find((c) => c.userId === selectedUserId);
  const selectedName = selectedConversation?.displayNameHindi || selectedConversation?.displayName || '';
  const selectedAvatar = selectedConversation?.avatarUrl || null;

  // Filter family members not already in conversations for new chat
  const existingConvUserIds = new Set(conversations.map((c) => c.userId));
  const newChatMembers = members.filter(
    (m) => m.member && !existingConvUserIds.has(m.family_member_id)
  );

  return (
    <div className="h-[calc(100vh-64px)] md:h-[calc(100vh-32px)] flex flex-col md:flex-row max-w-5xl mx-auto">
      {/* ─── Conversation List (left panel / full on mobile when no chat selected) ─── */}
      <div
        className={cn(
          'w-full md:w-[360px] md:border-r border-cream-dark flex flex-col bg-white',
          selectedUserId ? 'hidden md:flex' : 'flex'
        )}
      >
        {/* Header */}
        <div className="px-4 py-4 border-b border-cream-dark flex items-center justify-between">
          <div>
            <h2 className="font-heading text-2xl text-brown">संदेश</h2>
            <p className="font-body text-sm text-brown-light">Messages</p>
          </div>
          <GoldButton size="sm" onClick={handleNewChat}>
            + नया संदेश
          </GoldButton>
        </div>

        {/* New Chat Picker */}
        {showNewChat && (
          <div className="border-b border-cream-dark bg-cream p-3">
            <p className="font-body text-sm text-brown-light mb-2">
              परिवार का सदस्य चुनें — Select a family member
            </p>
            {members.length === 0 ? (
              <p className="font-body text-sm text-brown-light py-2">Loading...</p>
            ) : newChatMembers.length === 0 ? (
              <p className="font-body text-sm text-brown-light py-2">
                सभी से बात हो चुकी है — All family members have conversations
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {newChatMembers.map((m) => (
                  <button
                    key={m.family_member_id}
                    onClick={() => handleSelectNewChatUser(m.family_member_id)}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-cream-dark transition-colors min-h-dadi"
                  >
                    <AvatarCircle
                      src={m.member?.avatar_url}
                      name={m.member?.display_name}
                      size={36}
                    />
                    <div className="text-left">
                      <p className="font-body text-base text-brown font-semibold">
                        {m.member?.display_name_hindi || m.member?.display_name}
                      </p>
                      <p className="font-body text-xs text-brown-light">{m.relationship_hindi}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <GoldButton
              variant="ghost"
              size="sm"
              className="mt-2 w-full"
              onClick={() => setShowNewChat(false)}
            >
              बंद करें — Close
            </GoldButton>
          </div>
        )}

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && conversations.length === 0 ? (
            <div className="flex justify-center py-20">
              <LoadingSpinner />
            </div>
          ) : conversations.length === 0 ? (
            <EmptyState
              emoji="💬"
              title="कोई संदेश नहीं"
              subtitle="Start a conversation with family"
              action={
                <GoldButton size="sm" onClick={handleNewChat}>
                  नया संदेश भेजें — New Message
                </GoldButton>
              }
            />
          ) : (
            <div className="divide-y divide-cream-dark">
              {conversations.map((conv) => (
                <button
                  key={conv.userId}
                  onClick={() => handleSelectConversation(conv.userId)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors min-h-dadi',
                    selectedUserId === conv.userId
                      ? 'bg-unread-bg'
                      : conv.unreadCount > 0
                        ? 'bg-cream hover:bg-cream-dark'
                        : 'hover:bg-cream-dark'
                  )}
                >
                  <AvatarCircle
                    src={conv.avatarUrl}
                    name={conv.displayName}
                    size={48}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-body text-base text-brown font-semibold truncate">
                        {conv.displayNameHindi || conv.displayName}
                      </p>
                      <span className="font-body text-xs text-brown-light flex-shrink-0 ml-2">
                        {timeAgo(conv.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="font-body text-sm text-brown-light truncate">
                        {conv.lastMessage}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="bg-haldi-gold text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 flex-shrink-0 ml-2">
                          {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Chat View (right panel / full on mobile when chat selected) ─── */}
      <div
        className={cn(
          'flex-1 flex flex-col bg-cream',
          selectedUserId ? 'flex' : 'hidden md:flex'
        )}
      >
        {selectedUserId ? (
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-cream-dark bg-white flex items-center gap-3">
              <button
                onClick={handleBack}
                className="md:hidden text-haldi-gold font-body font-semibold text-base min-h-dadi px-2"
              >
                ← वापस
              </button>
              <AvatarCircle
                src={selectedAvatar}
                name={selectedName}
                size={40}
              />
              <div>
                <p className="font-body text-base text-brown font-semibold">{selectedName}</p>
                {selectedConversation?.displayNameHindi && selectedConversation.displayName !== selectedConversation.displayNameHindi && (
                  <p className="font-body text-xs text-brown-light">{selectedConversation.displayName}</p>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {isLoading && currentMessages.length === 0 ? (
                <div className="flex justify-center py-20">
                  <LoadingSpinner />
                </div>
              ) : currentMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <span className="text-4xl mb-3">🙏</span>
                  <p className="font-body text-brown-light text-base">
                    पहला संदेश भेजें — Send the first message
                  </p>
                </div>
              ) : (
                currentMessages.map((msg) => {
                  const isSent = msg.sender_id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={cn('flex', isSent ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[75%] px-4 py-3 rounded-2xl',
                          isSent
                            ? 'bg-haldi-gold text-white rounded-br-md'
                            : 'bg-white text-brown rounded-bl-md border border-cream-dark'
                        )}
                      >
                        <p className="font-body text-base whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                        <p
                          className={cn(
                            'font-body text-xs mt-1',
                            isSent ? 'text-white/70 text-right' : 'text-brown-light text-right'
                          )}
                        >
                          {timeAgo(msg.created_at)}
                          {isSent && msg.is_read && ' ✓✓'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="px-4 py-3 border-t border-cream-dark bg-white">
              <div className="flex items-center gap-2">
                <div className="flex-1 border-2 border-gray-300 focus-within:border-haldi-gold rounded-xl overflow-hidden bg-white">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="संदेश लिखें... Type a message..."
                    maxLength={VALIDATION.maxMessageLength}
                    className="w-full min-h-dadi px-4 text-brown font-body text-dadi bg-transparent outline-none placeholder-gray-400"
                  />
                </div>
                <GoldButton
                  onClick={handleSend}
                  disabled={!messageText.trim() || sending}
                  loading={sending}
                  size="md"
                  className="rounded-xl flex-shrink-0"
                >
                  भेजें ➤
                </GoldButton>
              </div>
              {messageText.length > VALIDATION.maxMessageLength * 0.9 && (
                <p className="font-body text-xs text-brown-light mt-1 text-right">
                  {messageText.length}/{VALIDATION.maxMessageLength}
                </p>
              )}
            </div>
          </>
        ) : (
          /* No chat selected — desktop placeholder */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <span className="text-6xl mb-4">💬</span>
            <h3 className="font-heading text-xl text-brown mb-1">संदेश चुनें</h3>
            <p className="font-body text-brown-light text-base">
              Select a conversation or start a new one
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

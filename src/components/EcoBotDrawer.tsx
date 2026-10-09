import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bot,
  X,
  Send,
  MicOff,
  Sparkles,
} from 'lucide-react';
import { ChatMessage } from '../types';
import { useScanContext } from '../context/ScanContext';
import { scanService } from '../services/scanService';
import ChatBubble from './ChatBubble';

interface EcoBotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  openerButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

export const EcoBotDrawer: React.FC<EcoBotDrawerProps> = ({
  isOpen,
  onClose,
  openerButtonRef,
}) => {
  const { items, scanData } = useScanContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Initialize welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'msg-welcome',
          sender: 'bot',
          text: `Hello! I can explain the ${items.length} items in the current scan using local, rule-based replies. I do not make a live AI model call. What would you like to know?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sourceChip: 'EcoBot v0.9 (demo)',
        },
      ]);
    }
  }, [items.length, messages.length]);

  // Focus management and ESC key listener
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
          openerButtonRef?.current?.focus();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      openerButtonRef?.current?.focus();
    }
  }, [isOpen, onClose, openerButtonRef]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  // Generate dynamic bot reply from current ScanContext items
  const generateBotReply = useCallback(
    (query: string): Omit<ChatMessage, 'id' | 'timestamp'> => {
      const q = query.trim().toLowerCase();

      // 1. "Where is the nearest hazardous depot?"
      if (q.includes('depot') || q.includes('nearest hazardous') || q.includes('hazardous drop')) {
        return {
          sender: 'bot',
          text: 'To locate an authorized recycling or hazardous disposal facility, I require your verified station coordinates. EcoScan AI will never fabricate or guess real-world addresses or contact numbers. Please share your location securely below.',
          sourceChip: 'Location safety protocol',
          isLocationRequest: true,
        };
      }

      // 2. "Why is item #N ...?"
      const itemNumMatch = q.match(/item\s*#?\s*(\d+)/i);
      if (itemNumMatch) {
        const itemNum = parseInt(itemNumMatch[1], 10);
        const matchedItem = items.find((i) => i.itemNumber === itemNum);

        if (matchedItem) {
          return {
            sender: 'bot',
            text: `Item #${matchedItem.itemNumber} is "${matchedItem.label}", classified as ${matchedItem.category.toUpperCase()} (${matchedItem.material}).\n\nTarget Bin: ${matchedItem.targetBin}.\nAction: ${matchedItem.actionRequired}.\n\nReason: ${matchedItem.whyReason}`,
            sourceChip: `From item #${matchedItem.itemNumber}`,
            miniItems: [matchedItem],
          };
        } else {
          return {
            sender: 'bot',
            text: `Item #${itemNum} was not found on the visible surface layer of the current scan. Try selecting one of the ${items.length} currently detected items.`,
            sourceChip: 'Telemetry lookup',
          };
        }
      }

      // 3. "What do I do with the battery?" / Hazardous query
      if (q.includes('battery') || q.includes('hazard') || q.includes('dangerous')) {
        const hazItems = items.filter((i) => i.isHazardous || i.category === 'hazardous');
        if (hazItems.length > 0) {
          const names = hazItems.map((i) => `#${i.itemNumber} ${i.label}`).join(', ');
          return {
            sender: 'bot',
            text: `Flagged ${hazItems.length} potentially hazardous item(s): ${names}.\n\n${hazItems.map(item => `#${item.itemNumber}: ${item.actionRequired}`).join('\n')}\n\nFollow local hazardous-waste handling rules. This is not a certified safety procedure.`,
            sourceChip: 'From hazard safety directive',
            miniItems: hazItems,
          };
        } else {
          return {
            sender: 'bot',
            text: 'No hazardous batteries or reactive materials were flagged in the current top surface scan.',
            sourceChip: 'From scan telemetry',
          };
        }
      }

      // 4. "Which items are worth the most?" / Value ranking
      if (q.includes('worth') || q.includes('value') || q.includes('price') || q.includes('valuable')) {
        const valuedItems = items
          .filter((i) => i.estimatedValueInr !== null)
          .sort((a, b) => {
            const midA = ((a.estimatedValueInr?.min ?? 0) + (a.estimatedValueInr?.max ?? 0)) / 2;
            const midB = ((b.estimatedValueInr?.min ?? 0) + (b.estimatedValueInr?.max ?? 0)) / 2;
            return midB - midA;
          });

        if (valuedItems.length > 0) {
          const topList = valuedItems
            .slice(0, 3)
            .map(
              (i, idx) =>
                `${idx + 1}. #${i.itemNumber} ${i.label} (${i.material}): ₹${i.estimatedValueInr?.min}-${i.estimatedValueInr?.max} INR`
            )
            .join('\n');

          return {
            sender: 'bot',
            text: `Top valuable recoverable materials ranked by secondary market midpoint:\n\n${topList}\n\nClean, uncontaminated non-ferrous metals and clean PET plastics command the highest scrap prices.`,
            sourceChip: 'From market scrap valuation',
            miniItems: valuedItems.slice(0, 3),
          };
        } else {
          return {
            sender: 'bot',
            text: 'No items with recoverable scrap value are currently identified in this batch.',
            sourceChip: 'From market scrap valuation',
          };
        }
      }

      // 5. "Summarise this scan" / Summary
      if (q.includes('summar') || q.includes('overview') || q.includes('report') || q.includes('total')) {
        const totalCount = items.length;
        const totalMass = items.reduce((acc, i) => acc + i.weightGrams, 0);
        const recItems = items.filter((i) => i.category === 'recyclable');
        const recMass = recItems.reduce((acc, i) => acc + i.weightGrams, 0);
        const recShare = totalMass > 0 ? ((recMass / totalMass) * 100).toFixed(1) : '0';

        let minVal = 0;
        let maxVal = 0;
        items.forEach((i) => {
          if (i.estimatedValueInr) {
            minVal += i.estimatedValueInr.min;
            maxVal += i.estimatedValueInr.max;
          }
        });

        const hazCount = items.filter((i) => i.isHazardous || i.category === 'hazardous').length;
        const nonRecMass = items
          .filter((i) => i.category === 'organic' || i.category === 'nonrecyclable')
          .reduce((acc, i) => acc + i.weightGrams, 0);
        const nonRecShare = totalMass > 0 ? ((nonRecMass / totalMass) * 100).toFixed(1) : '0';

        return {
          sender: 'bot',
          text: `Scan Summary (${scanData?.siteName || 'Current Station'}):\n` +
            `• Items detected: ${totalCount} visible pieces\n` +
            `• Total mass: ${totalMass} g (est.)\n` +
            `• Recoverable share: ${recShare}% by weight (${recMass} g)\n` +
            `• Est. value: ₹${minVal.toFixed(1)} - ₹${maxVal.toFixed(1)} INR\n` +
            `• Hazardous units: ${hazCount} flagged (lockout required)\n` +
            `• Non-recoverable share (organic + reject): ${nonRecShare}%`,
          sourceChip: 'From scan telemetry',
        };
      }

      // Fallback: Unknown questions
      return {
        sender: 'bot',
        text: 'I can answer questions about the items in this scan. Try one of the suggestions.',
        sourceChip: 'EcoScan Help',
      };
    },
    [items, scanData]
  );

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Execute scanService.chat with concurrent 700ms minimum typing indicator
      const [backendOrMockReply] = await Promise.all([
        scanService.chat(textToSend, items),
        new Promise((res) => setTimeout(res, 700)),
      ]);

      const structuredReply = generateBotReply(textToSend);
      const botMsg: ChatMessage = {
        ...structuredReply,
        text: backendOrMockReply || structuredReply.text,
        id: `bot-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const fallbackReply = generateBotReply(textToSend);
      const botMsg: ChatMessage = {
        ...fallbackReply,
        id: `bot-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  const quickPrompts = [
    'Why is item #2 organic?',
    'What do I do with the battery?',
    'Which items are worth the most?',
    'Summarise this scan',
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 transition-opacity"
        aria-hidden="true"
      />

      {/* Drawer Container: 380px wide on desktop, 70% bottom sheet on mobile */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-label="EcoBot Assistant Drawer"
        aria-modal="true"
        className="fixed bottom-0 left-0 right-0 h-[70vh] rounded-t-2xl sm:bottom-auto sm:top-0 sm:right-0 sm:left-auto sm:w-[380px] sm:h-full sm:rounded-none bg-slate-900 border-t sm:border-t-0 sm:border-l border-slate-800 z-50 flex flex-col shadow-2xl transition-transform duration-250 ease-out"
      >
        {/* Mobile Drag Handle */}
        <div className="w-full flex justify-center py-2 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-slate-700" />
        </div>

        {/* Drawer Header */}
        <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between gap-2 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">EcoBot</h2>
                <span className="font-mono text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
                  AI ASSISTANT
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                Context: {items.length} items from current scan
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close EcoBot drawer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat Message Scroll Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 select-text">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}

          {/* Typing Indicator (Three Pulsing Dots) */}
          {isTyping && (
            <div className="flex gap-2.5 items-center my-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm px-4 py-2.5 flex items-center gap-1.5 text-slate-400 shadow-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick-Prompt Chips */}
        <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-800/80 overflow-x-auto no-scrollbar flex items-center gap-1.5 select-none">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleSendMessage(prompt)}
              className="text-[11px] font-sans px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-emerald-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-emerald-400/80" />
              <span>{prompt}</span>
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
          {/* Disabled Mic Icon */}
          <button
            type="button"
            disabled
            aria-label="Voice input coming soon"
            title="Voice input coming soon"
            className="p-2 rounded-lg bg-slate-800/60 border border-slate-800 text-slate-500 cursor-not-allowed shrink-0 relative group"
          >
            <MicOff className="w-4 h-4" />
          </button>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDownInput}
            placeholder="Ask about items, sorting, or safety..."
            className="flex-1 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
          />

          {/* Send Button */}
          <button
            type="button"
            onClick={() => handleSendMessage(inputValue)}
            disabled={!inputValue.trim() || isTyping}
            aria-label="Send message"
            className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white transition-colors cursor-pointer shrink-0 shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};

export default EcoBotDrawer;

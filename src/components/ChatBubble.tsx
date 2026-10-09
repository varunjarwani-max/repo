import React, { useState } from 'react';
import { Bot, User, MapPin, AlertCircle } from 'lucide-react';
import { ChatMessage, Item } from '../types';
import { CATEGORY_META, BIN_MAPPING } from '../lib/constants';
import { useScanContext } from '../context/ScanContext';

interface ChatBubbleProps {
  message: ChatMessage;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.sender === 'user';
  const { setSelectedItemId, activeItemId } = useScanContext();
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  const handleShareLocation = () => {
    setLocationStatus('Location sharing is not connected in this demo');
  };

  return (
    <div className={`w-full flex gap-2.5 my-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Bot Avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
          <Bot className="w-4 h-4" />
        </div>
      )}

      {/* Message Bubble Body */}
      <div
        className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-3.5 text-xs leading-relaxed space-y-2.5 shadow-md ${
          isUser
            ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-100 rounded-tr-sm'
            : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm'
        }`}
      >
        {/* Source Chip if present on Bot message */}
        {!isUser && message.sourceChip && (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-emerald-400">
              {message.sourceChip}
            </span>
          </div>
        )}

        {/* Text Content */}
        <p className="whitespace-pre-line text-[12px]">{message.text}</p>

        {/* Location Request Button & Feedback */}
        {message.isLocationRequest && (
          <div className="pt-1 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleShareLocation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors shadow-sm cursor-pointer w-fit"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Share location</span>
            </button>

            {locationStatus && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-950/40 border border-amber-800/40 px-2.5 py-1.5 rounded-md">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{locationStatus}</span>
              </div>
            )}
          </div>
        )}

        {/* Mini Item Cards inside Reply */}
        {message.miniItems && message.miniItems.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-slate-700/60">
            {message.miniItems.map((item: Item) => {
              const meta = CATEGORY_META[item.category];
              const bin = BIN_MAPPING[item.category];
              const Icon = meta.icon;
              const isSelected = activeItemId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  className={`p-2.5 rounded-lg border bg-slate-900/90 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-emerald-400 ring-1 ring-emerald-400'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        style={{ backgroundColor: meta.colorHex }}
                        className="w-5 h-5 rounded font-mono text-[10px] font-bold text-slate-950 flex items-center justify-center shrink-0"
                      >
                        {String(item.itemNumber).padStart(2, '0')}
                      </span>
                      <div>
                        <div className="font-semibold text-white text-xs">{item.label}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] border ${meta.badgeClass}`}
                          >
                            <Icon className="w-2.5 h-2.5" />
                            <span>{meta.label}</span>
                          </span>
                          <span className="font-mono text-[9px] text-slate-400">{item.material}</span>
                          <span className="font-mono text-[9px] text-slate-400">• {item.weightGrams} g</span>
                        </div>
                      </div>
                    </div>

                    <span className="font-mono text-[10px] font-bold text-emerald-400 shrink-0">
                      {item.estimatedValueInr
                        ? `₹${item.estimatedValueInr.min}-${item.estimatedValueInr.max}`
                        : item.isHazardous
                        ? 'HAZARD'
                        : '—'}
                    </span>
                  </div>

                  {/* Bin & Action hint */}
                  <div className="mt-2 pt-1.5 border-t border-slate-800 text-[11px] text-slate-300 flex items-center gap-2">
                    <span
                      style={{ backgroundColor: bin.colorHex }}
                      className="w-2.5 h-2.5 rounded shrink-0"
                    />
                    <span className="text-slate-400 truncate">
                      {bin.binName} • {item.actionRequired}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Timestamp */}
        <div className="text-[10px] font-mono text-slate-400 text-right select-none pt-0.5">
          {message.timestamp}
        </div>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};

export default ChatBubble;

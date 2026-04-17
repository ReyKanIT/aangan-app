'use client';
import { useMemo, useState } from 'react';
import { REPLY_TEMPLATES, fillTemplate, type ReplyTemplate } from '@/data/replyTemplates';

interface Props {
  /** Reporter/user name for {{name}} substitution. */
  recipientName?: string | null;
  /** Human ticket reference for {{ticket}}, e.g. "TKT-001023" or "report/abc-123". */
  ticketRef?: string | null;
  /** Context link for {{link}}. */
  link?: string | null;
  /** Called when the admin clicks Send. Receives the final bodyHi + bodyEn + whether to resolve. */
  onSend: (bodyHi: string, bodyEn: string, shouldResolve: boolean) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * ReplyComposer — picker + dual-language textarea used on both admin/reports
 * and admin/support. Shows a template dropdown, fills placeholders, and lets
 * the admin tweak per reply. English and Hindi side-by-side so copy stays in
 * sync (most users read the Hindi; admins double-check English for phrasing).
 */
export default function ReplyComposer({ recipientName, ticketRef, link, onSend, placeholder, disabled }: Props) {
  const [templateId, setTemplateId] = useState<string>('');
  const [bodyHi, setBodyHi] = useState('');
  const [bodyEn, setBodyEn] = useState('');
  const [resolve, setResolve] = useState(false);
  const [sending, setSending] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');

  const visibleTemplates = useMemo(() => {
    const q = templateSearch.trim().toLowerCase();
    if (!q) return REPLY_TEMPLATES;
    return REPLY_TEMPLATES.filter((t) =>
      t.label.toLowerCase().includes(q)
      || t.subject.toLowerCase().includes(q)
      || t.category.toLowerCase().includes(q)
    );
  }, [templateSearch]);

  const applyTemplate = (tpl: ReplyTemplate) => {
    setTemplateId(tpl.id);
    const vars = { name: recipientName ?? undefined, ticket: ticketRef ?? undefined, link: link ?? undefined };
    setBodyHi(fillTemplate(tpl.bodyHi, vars));
    setBodyEn(fillTemplate(tpl.bodyEn, vars));
    setResolve(!!tpl.resolveAfterSending);
  };

  const handleSend = async () => {
    if (!bodyHi.trim() && !bodyEn.trim()) return;
    setSending(true);
    try {
      await onSend(bodyHi.trim(), bodyEn.trim(), resolve);
      setBodyHi('');
      setBodyEn('');
      setTemplateId('');
      setResolve(false);
    } finally {
      setSending(false);
    }
  };

  const canSend = !sending && !disabled && (bodyHi.trim() || bodyEn.trim());

  return (
    <div className="space-y-3">
      {/* Template picker */}
      <div className="border border-cream-dark rounded-lg p-3 bg-cream/40">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-sm font-semibold text-brown">Quick template</p>
          <input
            type="search"
            value={templateSearch}
            onChange={(e) => setTemplateSearch(e.target.value)}
            placeholder="Search templates…"
            className="text-sm px-2 py-1 border border-cream-dark rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-haldi-gold/40 w-44"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {visibleTemplates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => applyTemplate(tpl)}
              className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                templateId === tpl.id
                  ? 'bg-haldi-gold text-brown border-haldi-gold'
                  : 'bg-white border-cream-dark text-brown-light hover:border-haldi-gold hover:text-brown'
              }`}
              title={tpl.subject}
            >
              {tpl.label}
            </button>
          ))}
          {visibleTemplates.length === 0 && (
            <p className="text-xs text-brown-light italic">No template matches — compose manually.</p>
          )}
        </div>
      </div>

      {/* Dual-language bodies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-brown-light mb-1">Hindi · हिंदी</label>
          <textarea
            value={bodyHi}
            onChange={(e) => setBodyHi(e.target.value)}
            rows={8}
            placeholder={placeholder ?? 'हिंदी में जवाब लिखें…'}
            className="w-full px-3 py-2 border border-cream-dark rounded-lg text-sm text-brown focus:outline-none focus:ring-2 focus:ring-haldi-gold/40 resize-y"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-brown-light mb-1">English</label>
          <textarea
            value={bodyEn}
            onChange={(e) => setBodyEn(e.target.value)}
            rows={8}
            placeholder={placeholder ?? 'Type your reply in English…'}
            className="w-full px-3 py-2 border border-cream-dark rounded-lg text-sm text-brown focus:outline-none focus:ring-2 focus:ring-haldi-gold/40 resize-y"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm text-brown">
          <input
            type="checkbox"
            checked={resolve}
            onChange={(e) => setResolve(e.target.checked)}
            className="accent-haldi-gold w-4 h-4"
          />
          Mark resolved after sending
        </label>
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="px-4 py-2 rounded-lg bg-haldi-gold text-brown font-medium text-sm hover:bg-haldi-gold-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? 'Sending…' : resolve ? 'Send & resolve' : 'Send reply'}
        </button>
      </div>
    </div>
  );
}

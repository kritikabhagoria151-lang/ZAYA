import React, {useState} from 'react';
import {Check, Copy} from 'lucide-react';

interface MarkdownTextProps {
  content: string;
}

function renderInline(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      tokens.push(
        <code
          key={keyIdx++}
          className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[13px] text-emerald-200"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      tokens.push(
        <strong key={keyIdx++} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      tokens.push(
        <em key={keyIdx++} className="italic text-zinc-200">
          {token.slice(1, -1)}
        </em>,
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }

  return tokens;
}

const CodeBlock: React.FC<{code: string; lang: string}> = ({code, lang}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="my-2.5 overflow-hidden rounded-xl border border-white/10 bg-[#141418]">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#1a1a20] px-3 py-1.5 text-xs text-zinc-400">
        <span className="font-mono">{lang || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-[13px] leading-relaxed text-zinc-200 font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export const MarkdownText: React.FC<MarkdownTextProps> = ({content}) => {
  const segments = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2.5 text-[15px] leading-[1.65] tracking-[0.005em] text-[#ececf1] break-words">
      {segments.map((segment, segIdx) => {
        if (segment.startsWith('```') && segment.endsWith('```')) {
          const inner = segment.slice(3, -3);
          const firstNewline = inner.indexOf('\n');
          const lang = firstNewline !== -1 ? inner.slice(0, firstNewline).trim() : '';
          const code = firstNewline !== -1 ? inner.slice(firstNewline + 1) : inner;
          return <CodeBlock key={segIdx} code={code} lang={lang} />;
        }

        const lines = segment.split('\n');
        const elements: React.ReactNode[] = [];
        let listBuffer: {type: 'ul' | 'ol'; items: string[]} | null = null;

        const flushList = (keyPrefix: number) => {
          if (!listBuffer) return;
          if (listBuffer.type === 'ul') {
            elements.push(
              <ul key={`ul-${keyPrefix}`} className="list-disc space-y-1.5 pl-5 text-[#e4e4ea]">
                {listBuffer.items.map((item, idx) => (
                  <li key={idx}>{renderInline(item)}</li>
                ))}
              </ul>,
            );
          } else {
            elements.push(
              <ol key={`ol-${keyPrefix}`} className="list-decimal space-y-1.5 pl-5 text-[#e4e4ea]">
                {listBuffer.items.map((item, idx) => (
                  <li key={idx}>{renderInline(item)}</li>
                ))}
              </ol>,
            );
          }
          listBuffer = null;
        };

        lines.forEach((rawLine, lineIdx) => {
          const line = rawLine.trimEnd();
          const ulMatch = line.match(/^\s*[-*•]\s+(.+)$/);
          const olMatch = line.match(/^\s*\d+[.)]\s+(.+)$/);
          const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);

          if (ulMatch) {
            if (listBuffer && listBuffer.type !== 'ul') flushList(lineIdx);
            if (!listBuffer) listBuffer = {type: 'ul', items: []};
            listBuffer.items.push(ulMatch[1]);
          } else if (olMatch) {
            if (listBuffer && listBuffer.type !== 'ol') flushList(lineIdx);
            if (!listBuffer) listBuffer = {type: 'ol', items: []};
            listBuffer.items.push(olMatch[1]);
          } else {
            flushList(lineIdx);
            if (!line.trim()) {
              return;
            }
            if (headingMatch) {
              elements.push(
                <h4 key={`h-${lineIdx}`} className="font-display pt-1 text-[15px] font-semibold text-white">
                  {renderInline(headingMatch[2])}
                </h4>,
              );
            } else {
              elements.push(<p key={`p-${lineIdx}`}>{renderInline(line)}</p>);
            }
          }
        });

        flushList(lines.length);
        return <React.Fragment key={segIdx}>{elements}</React.Fragment>;
      })}
    </div>
  );
};

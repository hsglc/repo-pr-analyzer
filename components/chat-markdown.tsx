"use client";

import { useMemo } from "react";

interface ChatMarkdownProps {
  content: string;
}

interface Block {
  type: "code" | "text";
  content: string;
  language?: string;
}

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    blocks.push({
      type: "code",
      language: match[1] || undefined,
      content: match[2].replace(/\n$/, ""),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    blocks.push({ type: "text", content: text.slice(lastIndex) });
  }

  return blocks;
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Match inline code, bold, and regular text
  const inlineRegex = /(`[^`]+`)|(\*\*[^*]+\*\*)/g;
  let lastIdx = 0;
  let match;

  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      nodes.push(text.slice(lastIdx, match.index));
    }

    if (match[1]) {
      // inline code
      nodes.push(
        <code
          key={match.index}
          className="rounded bg-[var(--color-bg-tertiary)] px-1 py-0.5 text-[0.85em] font-mono"
        >
          {match[1].slice(1, -1)}
        </code>
      );
    } else if (match[2]) {
      // bold
      nodes.push(
        <strong key={match.index}>{match[2].slice(2, -2)}</strong>
      );
    }

    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < text.length) {
    nodes.push(text.slice(lastIdx));
  }

  return nodes;
}

function TextBlock({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  function flushList() {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="my-1 ml-4 list-disc space-y-0.5">
          {listItems.map((item, i) => (
            <li key={i} className="text-sm">{renderInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "") {
      flushList();
      continue;
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const className =
        level === 1
          ? "text-base font-bold mt-3 mb-1"
          : level === 2
            ? "text-sm font-bold mt-2 mb-1"
            : "text-sm font-semibold mt-1.5 mb-0.5";
      elements.push(
        <div key={key++} className={className}>
          {renderInlineMarkdown(text)}
        </div>
      );
      continue;
    }

    // List items
    const listMatch = trimmed.match(/^[-*]\s+(.+)/);
    if (listMatch) {
      listItems.push(listMatch[1]);
      continue;
    }

    // Numbered list items
    const numMatch = trimmed.match(/^\d+\.\s+(.+)/);
    if (numMatch) {
      listItems.push(numMatch[1]);
      continue;
    }

    // Regular paragraph line
    flushList();
    elements.push(
      <p key={key++} className="text-sm my-0.5">
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  }

  flushList();
  return <>{elements}</>;
}

function CodeBlock({
  content,
  language,
}: {
  content: string;
  language?: string;
}) {
  return (
    <div className="my-2 overflow-hidden rounded-lg border border-[var(--color-border)]">
      {language && (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-1">
          <span className="text-[10px] font-medium uppercase text-[var(--color-text-muted)]">
            {language}
          </span>
        </div>
      )}
      <pre className="overflow-x-auto bg-[var(--color-bg-secondary)] p-3 text-xs leading-relaxed">
        <code>{content}</code>
      </pre>
    </div>
  );
}

export function ChatMarkdown({ content }: ChatMarkdownProps) {
  const blocks = useMemo(() => parseBlocks(content), [content]);

  return (
    <div className="chat-markdown">
      {blocks.map((block, i) =>
        block.type === "code" ? (
          <CodeBlock key={i} content={block.content} language={block.language} />
        ) : (
          <TextBlock key={i} content={block.content} />
        )
      )}
    </div>
  );
}

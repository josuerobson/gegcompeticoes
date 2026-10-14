import React from 'react';

// Matches http(s):// or www.-prefixed tokens, stopping before trailing
// punctuation/closing brackets so "confira: https://site.com." doesn't eat
// the sentence's final period into the link.
const URL_REGEX = /((?:https?:\/\/|www\.)[^\s<]+[^\s<.,:;!?'")\]])/gi;

// Renders free text with any http(s)/www. URL turned into a real <a target="_blank">
// link, used for post/comment content so a pasted link is immediately clickable
// instead of sitting there as plain text.
export function linkifyText(text: string): React.ReactNode[] {
  // With a single capturing group, String.split interleaves the matched URLs
  // at odd indices and the surrounding plain text at even indices.
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (i % 2 === 0 || !part) return part;
    const href = part.startsWith('http') ? part : `https://${part}`;
    return (
      <a
        key={i}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-blue-600 hover:text-blue-700 underline break-words"
      >
        {part}
      </a>
    );
  });
}

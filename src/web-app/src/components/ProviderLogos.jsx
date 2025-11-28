// @version 2.2.96
import React from "react";

export const ClaudeLogo = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
  </svg>
);

export const GeminiLogo = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" />
    <path
      d="M12 6L13.5 10.5L18 12L13.5 13.5L12 18L10.5 13.5L6 12L10.5 10.5L12 6Z"
      opacity="0.5"
    />
  </svg>
);

export const OpenAILogo = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2.5C12 2.5 16.5 5 16.5 5C18.5 6 19.5 8.5 18.5 10.5L17.5 12.5L20.5 14C20.5 14 18 18.5 18 18.5C17 20.5 14.5 21.5 12.5 20.5L10.5 19.5L9 22.5C9 22.5 4.5 20 4.5 20C2.5 19 1.5 16.5 2.5 14.5L3.5 12.5L0.5 11C0.5 11 3 6.5 3 6.5C4 4.5 6.5 3.5 8.5 4.5L10.5 5.5L12 2.5ZM12 8.5C10 8.5 8.5 10 8.5 12C8.5 14 10 15.5 12 15.5C14 15.5 15.5 14 15.5 12C15.5 10 14 8.5 12 8.5Z" />
  </svg>
);

export const MistralLogo = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M2 12C2 12 5 9 8 9C11 9 12 12 12 12C12 12 13 9 16 9C19 9 22 12 22 12V20H19V13C19 13 18 11 16 11C14 11 13 13 13 13V20H11V13C11 13 10 11 8 11C6 11 5 13 5 13V20H2V12Z" />
  </svg>
);

export const ToolooLogo = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle
      cx="12"
      cy="12"
      r="8"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
    <path
      d="M12 2V4M12 20V22M2 12H4M20 12H22"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

export const getProviderLogo = (providerName, className) => {
  const name = providerName.toLowerCase();
  if (name.includes("claude") || name.includes("anthropic"))
    return <ClaudeLogo className={className} />;
  if (name.includes("gemini") || name.includes("google"))
    return <GeminiLogo className={className} />;
  if (name.includes("openai") || name.includes("gpt"))
    return <OpenAILogo className={className} />;
  if (name.includes("mistral")) return <MistralLogo className={className} />;
  return <ToolooLogo className={className} />;
};

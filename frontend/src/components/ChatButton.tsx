import React, { useState } from "react";
import { MessageCircle } from "lucide-react";
import ChatDock from "./ChatDock";

interface ChatButtonProps {
  context?: {
    currentPage?: string;
    symbol?: string;
    currency?: string;
    dateRange?: string;
  };
  initialMessage?: string;
}

const ChatButton: React.FC<ChatButtonProps> = ({ context, initialMessage }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center z-40 transition-all duration-200 hover:scale-105"
        title="Open GoldVision Copilot"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Dock */}
      <ChatDock
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        context={context}
        initialMessage={initialMessage}
      />
    </>
  );
};

export default ChatButton;

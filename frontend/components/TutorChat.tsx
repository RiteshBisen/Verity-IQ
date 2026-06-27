"use client";

import { useState, useEffect, useRef } from "react";
import { X, Send, Bot, User } from "lucide-react";
import { Question, ChatMessage } from "@/types";
import { chatWithTutor } from "@/services/api";

interface TutorChatProps {
  question: Question;
  userAnswer: string;
  onClose: () => void;
}

export default function TutorChat({ question, userAnswer, onClose }: TutorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Initial trigger to start conversation
  useEffect(() => {
    const fetchInitial = async () => {
      setIsLoading(true);
      const initialMessage: ChatMessage = {
        role: "user",
        content: "Can you help me understand why my answer was incorrect?",
      };
      setMessages([initialMessage]);
      try {
        const response = await chatWithTutor({
          question,
          user_answer: userAnswer,
          messages: [initialMessage],
        });
        setMessages([initialMessage, { role: "model", content: response.reply }]);
      } catch (err) {
        setMessages([
          initialMessage,
          { role: "model", content: "Sorry, I am having trouble connecting with the AI tutoring engine." },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitial();
  }, [question, userAnswer]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const newMessages = [...messages, { role: "user" as const, content: input.trim() }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await chatWithTutor({
        question,
        user_answer: userAnswer,
        messages: newMessages,
      });
      setMessages([...newMessages, { role: "model", content: response.reply }]);
    } catch (err) {
      setMessages([
        ...newMessages,
        { role: "model", content: "Sorry, I am having trouble responding right now." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div data-pdf-exclude className="fixed inset-0 z-50 flex justify-end font-display">
      {/* Backdrop overlay clickable to dismiss */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer transition-opacity" 
        onClick={onClose}
      />
      
      {/* Drawer panel */}
      <div className="relative z-10 w-full max-w-lg bg-card border-l border-border rounded-l-3xl shadow-2xl flex flex-col overflow-hidden h-full max-h-screen animate-slide-left">
        
        {/* Header panel */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-accent-light/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brutal-blue/10 rounded-full flex items-center justify-center text-brutal-blue">
              <Bot className="w-5 h-5 text-brutal-blue stroke-[2]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">AI Academic Tutor</h3>
              <p className="text-xs text-muted">Interactive Logic Review</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full text-muted hover:bg-accent-light hover:text-foreground transition-all flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2]" />
          </button>
        </div>

        {/* Question context overview */}
        <div className="p-5 bg-accent-light/40 border-b border-border text-sm leading-relaxed space-y-3">
          <div>
            <span className="text-xs font-semibold text-muted block mb-1">Question Analyzed</span>
            <p className="text-foreground font-medium">{question.question}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 pt-1 text-xs text-muted">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-brutal-red rounded-full inline-block" />
              <span>Your Answer: <strong className="text-foreground font-semibold">{userAnswer}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-brutal-green rounded-full inline-block" />
              <span>Correct Answer: <strong className="text-foreground font-semibold">{question.correctAnswer}</strong></span>
            </div>
          </div>
        </div>

        {/* Chat message flow */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-card">
          {messages.map((msg, idx) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={idx}
                className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}
              >
                {/* Bubble Icon */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs
                    ${isUser ? "bg-accent-light text-muted" : "bg-brutal-blue/10 text-brutal-blue"}`}
                >
                  {isUser ? <User className="w-4 h-4 stroke-[2]" /> : <Bot className="w-4 h-4 stroke-[2]" />}
                </div>
                
                {/* Text block */}
                <div
                  className={`p-3.5 rounded-2xl text-sm leading-relaxed max-w-[75%]
                    ${
                      isUser
                        ? "bg-brutal-blue text-white dark:text-neutral-950 font-medium rounded-tr-xs"
                        : "bg-accent-light text-foreground rounded-tl-xs"
                    }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })}
          
          {/* Loading bubble */}
          {isLoading && (
            <div className="flex items-start gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-brutal-blue/10 text-brutal-blue flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 stroke-[2]" />
              </div>
              <div className="p-3.5 rounded-2xl bg-accent-light flex items-center gap-1.5">
                <span className="w-2 h-2 bg-muted rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-muted rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 bg-muted rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Action input bar */}
        <div className="p-4 border-t border-border bg-card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the AI Tutor why an option is correct or incorrect..."
              disabled={isLoading}
              className="flex-1 bg-accent-light border border-border px-5 py-3 text-sm text-foreground placeholder-muted/60 focus:outline-none focus:ring-2 focus:ring-brutal-blue/50 focus:border-brutal-blue rounded-full disabled:opacity-50 transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-3 rounded-full bg-brutal-blue text-white hover:bg-brutal-blue/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
            >
              <Send className="w-5 h-5 stroke-[2]" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

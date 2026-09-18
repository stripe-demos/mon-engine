import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../../../icons/SailIcons';
import { Button } from '../../../../sail';
import { CATEGORY_LABELS } from '../constants';
import { useMonetization } from '../MonetizationContext';
import AddReferenceDialog from './AddReferenceDialog';

function CodeBlock({ content }) {
  return (
    <pre className="rounded-md bg-offset border border-border p-3 overflow-x-auto text-label-small text-default">
      <code>{content}</code>
    </pre>
  );
}

function ChatBubble({ message, onAction }) {
  const isUser = message.role === 'user';

  const bubbleClass = isUser
    ? 'bg-brand text-white ml-auto'
    : 'bg-offset text-default';

  if (message.type === 'progress') {
    return (
      <div className="flex items-center gap-2 text-label-small text-subdued py-1" aria-live="polite">
        <Icon name="spinner" size="xsmall" className="animate-spin" />
        {message.content}
      </div>
    );
  }

  if (message.type === 'audit') {
    const isActive = message.status === 'active';
    const isPending = !isActive && message.allRequiredFound === false;
    return (
      <div className="max-w-[92%]" aria-live="polite">
        <div className="flex items-center gap-2 mb-1.5">
          <Icon
            name={isActive ? 'spinner' : isPending ? 'warning' : 'checkCircleFilled'}
            size="xsmall"
            fill="currentColor"
            className={isActive ? 'animate-spin text-icon-brand' : isPending ? 'text-icon-attention' : 'text-icon-success'}
          />
          <p className="text-label-medium-emphasized text-default flex-1">{message.title}</p>
        </div>
        {isActive ? (
          <div className="space-y-1 pl-5 border-l border-border/60">
            {message.entries.map((entry) => (
              <div
                key={entry.field}
                className="flex items-start gap-1.5 text-label-small opacity-0 [animation:fadeInStep_0.35s_ease_forwards]"
              >
                <Icon
                  name={entry.state === 'found' ? 'checkCircleFilled' : entry.state === 'missing' ? 'circle' : 'spinner'}
                  size="xxsmall"
                  fill="currentColor"
                  className={`shrink-0 mt-0.5 ${
                    entry.state === 'found' ? 'text-icon-success' : entry.state === 'missing' ? 'text-icon-subdued' : 'animate-spin text-icon-brand'
                  }`}
                />
                {entry.state === 'searching' && <span className="text-subdued">Searching: {entry.label}</span>}
                {entry.state === 'found' && (
                  <span>
                    <span className="text-subdued">{entry.label}: </span>
                    <span className="text-default">{entry.value}</span>
                  </span>
                )}
                {entry.state === 'missing' && <span className="text-subdued">{entry.label}: not found in source</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="pl-5 space-y-0.5">
            <p className="text-body-small text-subdued">{message.requiredSummary}</p>
            <p className="text-body-small text-subdued">{message.optionalSummary}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`max-w-[85%] ${isUser ? 'ml-auto' : ''}`}>
      {message.category && !isUser && (
        <p className="text-label-small text-subdued mb-1">{CATEGORY_LABELS[message.category]}</p>
      )}
      <div className={`rounded-lg px-3.5 py-2.5 text-body-medium ${bubbleClass}`}>
        {message.type === 'code' ? <CodeBlock language={message.language} content={message.content} /> : <p className="whitespace-pre-wrap">{message.content}</p>}

        {message.type === 'action' && (
          <div className="flex flex-wrap gap-2 mt-3">
            {message.actions.map((action) => (
              <Button
                key={action.id}
                size="sm"
                variant={action.recommended ? 'primary' : 'secondary'}
                onClick={() => onAction(action.id)}
              >
                {action.label}
                {action.recommended && <span className="ml-1 text-label-small">· Recommended</span>}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPanel() {
  const { messages, handleAction, answerCategoryQuestion, pendingQuestionCategory, pushMessage } = useMonetization();
  const [input, setInput] = useState('');
  const [referenceDialogOpen, setReferenceDialogOpen] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    if (pendingQuestionCategory) {
      answerCategoryQuestion(pendingQuestionCategory, text);
    } else {
      pushMessage({ role: 'user', type: 'text', content: text });
      pushMessage({
        role: 'assistant',
        type: 'text',
        content: "Got it — I've noted that. You can also use the artifact actions on the right to update a specific section.",
      });
    }
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
        <h2 className="text-label-medium-emphasized text-default">Agent chat</h2>
        <button
          type="button"
          onClick={() => setReferenceDialogOpen(true)}
          className="flex items-center gap-1 text-label-small-emphasized text-subdued hover:text-default cursor-pointer"
        >
          <Icon name="add" size="xsmall" fill="currentColor" />
          Add reference
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto space-y-4 pb-4 pt-4 px-1" aria-live="polite">
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} onAction={handleAction} />
        ))}
      </div>
      <form onSubmit={handleSend} className="border-t border-border pt-3 flex items-center gap-2 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={pendingQuestionCategory ? `Answer about ${CATEGORY_LABELS[pendingQuestionCategory]}…` : 'Ask the agent or add more detail…'}
          aria-label="Message the Monetization Engine agent"
          className="flex-1 h-10 px-3 rounded-md border border-border bg-surface text-body-medium text-default outline-none focus:ring-4 focus:ring-[rgba(8,142,249,0.2)]"
        />
        <Button type="submit" size="lg" disabled={!input.trim()}>Send</Button>
      </form>
      <AddReferenceDialog open={referenceDialogOpen} onClose={() => setReferenceDialogOpen(false)} />
    </div>
  );
}

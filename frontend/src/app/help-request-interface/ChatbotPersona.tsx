'use client';
import ChatbotBase from './ChatbotBase';
export default function ChatbotPersona({ onBack }: { onBack: () => void }) {
  return <ChatbotBase onBack={onBack} endpoint="/chat/persona" title="Necessito ajuda" subtitle="L'IA de Càritas et connectarà amb els recursos adequats" welcomeMessage="Hola! Sóc l'assistent de Càritas i estic aquí per ajudar-te. Tot és confidencial. En quin municipi vius?" />;
}

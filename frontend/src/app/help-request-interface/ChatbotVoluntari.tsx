'use client';
import ChatbotBase from './ChatbotBase';
export default function ChatbotVoluntari({ onBack }: { onBack: () => void }) {
  return <ChatbotBase onBack={onBack} endpoint="/chat/voluntari" title="Vull fer voluntariat" subtitle="L'IA de Càritas et guiarà per trobar el projecte ideal" welcomeMessage="Hola! Sóc l'assistent de Càritas i t'ajudaré a trobar el projecte de voluntariat perfecte. En quin municipi vius?" />;
}

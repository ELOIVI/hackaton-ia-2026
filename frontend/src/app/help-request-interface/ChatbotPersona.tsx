'use client';
import ChatbotBase from './ChatbotBase';

export default function ChatbotPersona({ onBack }: { onBack: () => void }) {
  return (
    <ChatbotBase
      onBack={onBack}
      endpoint="/chat/persona"
      title="Necessito ajuda"
      subtitle="L'IA de Càritas et connectarà amb els recursos adequats"
      welcomeMessage="Hola! Sóc l'assistent de Càritas i estic aquí per escoltar-te i ajudar-te a trobar els recursos que necessites. Tot el que em comentes és confidencial. Per on vols que comencem? Pots dir-me en quin municipi vius?"
    />
  );
}

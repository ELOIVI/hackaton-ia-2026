import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirigimos automáticamente al usuario al módulo principal
  redirect('/help-request-interface');
}
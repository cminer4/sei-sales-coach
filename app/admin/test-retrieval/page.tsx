import { redirect } from 'next/navigation';

export default function TestRetrievalRedirect() {
  redirect('/admin?tab=test');
}

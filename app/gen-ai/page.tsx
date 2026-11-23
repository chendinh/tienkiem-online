import { GenAi } from '@/components/genai/GenAi';
import './genai.css';

export const metadata = { title: 'Chân dung tu tiên AI · Tiên Kiếm', robots: { index: false, follow: false } };
// A page of its own (the game is not loaded here). The page holds no secrets: it talks to /api/gen-ai with the player's game session.
export default function GenAiPage() { return <GenAi />; }

import { createRoot } from 'react-dom/client';
import './style.css';
import { Demo } from './sections/Demo';
import { Finale } from './sections/Finale';
import { Funnel } from './sections/Funnel';
import { Hero } from './sections/Hero';
import { Struggle } from './sections/Struggle';
import { TakeOff } from './sections/TakeOff';
import { Cursor, Rail, TopBar } from './ui';

createRoot(document.getElementById('root')!).render(
  <>
    <TopBar />
    <Rail />
    <Cursor />
    <main>
      <Hero />
      <Struggle />
      <TakeOff />
      <Funnel />
      <Demo />
      <Finale />
    </main>
  </>,
);

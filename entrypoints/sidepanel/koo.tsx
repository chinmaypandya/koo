import { useEffect, useRef, useState } from 'react';

// Koo, the explorer bird (assets/avatar.md, look from assets/mascot.png). Purely presentational: it renders whatever
// state the scanner wrote to storage (`agent`) and never drives the search itself.
export const STATES: Record<string, { caption: string; scene: 'sky' | 'tree' | 'river'; pose: 'fly' | 'sit' }> = {
  sleeping: { caption: 'Taking a little rest…', scene: 'tree', pose: 'sit' },
  starting: { caption: 'Taking off…', scene: 'sky', pose: 'fly' },
  searching: { caption: 'Searching for your next home…', scene: 'sky', pose: 'fly' },
  dancing: { caption: 'Found a match!', scene: 'sky', pose: 'fly' },
  irritated: { caption: 'Still searching… where are all the flats?', scene: 'sky', pose: 'fly' },
  drinking: { caption: 'Quick water break…', scene: 'river', pose: 'sit' },
  energy: { caption: 'Energy drink! Recharging…', scene: 'river', pose: 'sit' },
  stopping: { caption: 'Landing…', scene: 'tree', pose: 'fly' },
  error: { caption: 'Something went wrong', scene: 'tree', pose: 'sit' },
};
export const stateOf = (agent: string | undefined) => (agent && STATES[agent] ? agent : 'sleeping');

const C = { blue: '#2563EB', light: '#93C5FD', orange: '#F59E0B', cream: '#FEF3C7', dark: '#0F172A', brown: '#8B5A2B' };

function Bird({ state }: { state: string }) {
  const ink = { stroke: C.dark, strokeWidth: 4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  const eyes =
    state === 'sleeping' ? <path d="M78 90 Q86 96 94 90 M106 90 Q114 96 122 90" fill="none" {...ink} />
    : state === 'dancing' || state === 'drinking' ? <path d="M78 92 Q86 82 94 92 M106 92 Q114 82 122 92" fill="none" {...ink} />
    : state === 'error' ? <path d="M80 82 L92 94 M92 82 L80 94 M108 82 L120 94 M120 82 L108 94" fill="none" {...ink} />
    : (
      <>
        {[86, 114].map((x) => (
          <g key={x} className="eye">
            <circle cx={x} cy={88} r={10} fill="#fff" stroke={C.dark} strokeWidth={3} />
            <circle cx={x + 2} cy={89} r={6} fill={C.dark} />
            <circle cx={x + 4} cy={86} r={2} fill="#fff" />
          </g>
        ))}
        {/* Narrowed eyes + brows when irritated */}
        {state === 'irritated' && <path d="M74 76 L96 82 M126 76 L104 82 M76 82 h20 M104 82 h20" fill="none" {...ink} strokeWidth={4} />}
      </>
    );
  return (
    <svg viewBox="0 0 200 200" className="koo-svg" role="img" aria-label={`Koo: ${STATES[state]!.caption}`}>
      {/* tail */}
      <path d="M58 150 L22 172 L34 150 L18 150 L56 136 Z" fill={C.blue} {...ink} />
      {/* backpack with house emblem, on Koo's back */}
      <rect x={24} y={106} width={42} height={50} rx={10} fill={C.brown} {...ink} />
      <path d="M36 132 L45 123 L54 132 M39 130 v10 h12 v-10" fill={C.cream} stroke={C.dark} strokeWidth={2.5} strokeLinejoin="round" />
      {/* feet */}
      <path className="feet" d="M86 176 v14 M80 192 h12 M114 176 v14 M108 192 h12" fill="none" stroke={C.orange} strokeWidth={5} strokeLinecap="round" />
      {/* body: blue back, cream belly */}
      <ellipse cx={100} cy={140} rx={50} ry={44} fill={C.blue} {...ink} />
      <ellipse cx={104} cy={146} rx={36} ry={34} fill={C.cream} />
      {/* head: blue crown, cream face */}
      <path d="M72 44 L64 20 L84 36 L88 12 L100 36" fill={C.blue} {...ink} />
      <circle cx={100} cy={82} r={46} fill={C.blue} {...ink} />
      <ellipse cx={102} cy={96} rx={36} ry={30} fill={C.cream} />
      {/* aviator goggles on the forehead */}
      <path d="M56 58 Q100 40 144 58" fill="none" stroke={C.brown} strokeWidth={8} />
      {[82, 118].map((x) => (
        <g key={x}>
          <circle cx={x} cy={54} r={13} fill={C.light} stroke={C.brown} strokeWidth={5} />
          <path d={`M${x - 6} ${50} q4 -5 9 -3`} stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" />
        </g>
      ))}
      {eyes}
      {/* beak */}
      <path d={state === 'dancing' ? 'M92 102 L112 102 L102 110 Z M92 104 L112 104 L102 120 Z' : 'M92 102 L114 104 L100 116 Z'} fill={C.orange} {...ink} strokeWidth={3} />
      {/* wings */}
      <ellipse className="wing l" cx={56} cy={132} rx={16} ry={34} fill={C.blue} {...ink} />
      <ellipse className="wing r" cx={146} cy={132} rx={16} ry={34} fill={C.blue} {...ink} />
      {/* props per state */}
      {state === 'drinking' && (
        <g className="prop sip">
          <rect x={132} y={92} width={22} height={42} rx={6} fill={C.light} {...ink} strokeWidth={3} />
          <rect x={137} y={84} width={12} height={10} fill={C.blue} {...ink} strokeWidth={3} />
        </g>
      )}
      {state === 'energy' && (
        <g className="prop sip">
          <rect x={132} y={90} width={24} height={44} rx={4} fill="#DC2626" {...ink} strokeWidth={3} />
          <path d="M146 98 L138 114 H146 L140 128" fill="none" stroke="#FDE047" strokeWidth={4} strokeLinejoin="round" />
        </g>
      )}
      {state === 'sleeping' && <text className="zz" x={148} y={40} fontSize={28} fontWeight={700} fill={C.blue}>z</text>}
      {state === 'dancing' && <text className="notes" x={150} y={40} fontSize={30} fill={C.orange}>♪</text>}
      {state === 'irritated' && <text className="swirl" x={142} y={36} fontSize={28}>💢</text>}
    </svg>
  );
}

// Deterministic skyline so it doesn't jump between renders; drawn twice side by side and scrolled for an endless city.
const BUILDINGS = Array.from({ length: 14 }, (_, i) => ({ x: i * 30, w: 22 + ((i * 7) % 9), h: 40 + ((i * 37) % 70) }));
function Skyline({ className }: { className: string }) {
  const one = (dx: number) =>
    BUILDINGS.map((b) => <rect key={`${dx}-${b.x}`} x={b.x + dx} y={120 - b.h} width={b.w} height={b.h} />);
  return (
    <svg className={`skyline ${className}`} viewBox="0 0 840 120" preserveAspectRatio="none" aria-hidden="true">
      {one(0)}{one(420)}
    </svg>
  );
}

// Plays a flapping "travel" animation whenever Koo changes place (take-off, landing, going down to the river).
function useTravelling(place: string) {
  const [moving, setMoving] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) return void (first.current = false);
    setMoving(true);
    const t = setTimeout(() => setMoving(false), 1400);
    return () => clearTimeout(t);
  }, [place]);
  return moving;
}

export function KooStage({ agent }: { agent: string | undefined }) {
  const state = stateOf(agent);
  const { scene, pose } = STATES[state]!;
  const moving = useTravelling(scene);
  return (
    <>
      <div className="scenes" aria-hidden="true">
        <div className={`scene sky${scene === 'sky' ? ' on' : ''}`}>
          <div className="cloud c1" /><div className="cloud c2" />
          <Skyline className="far" /><Skyline className="near" />
        </div>
        <div className={`scene tree${scene === 'tree' ? ' on' : ''}`}>
          <div className="moon" /><div className="branch" />
        </div>
        <div className={`scene river${scene === 'river' ? ' on' : ''}`}>
          <div className="bank" /><div className="water" />
        </div>
      </div>
      <div className={`buddy at-${scene}`}>
        <div className={`koo st-${state} pose-${moving ? 'fly' : pose}`}>
          <Bird state={state} />
        </div>
      </div>
    </>
  );
}

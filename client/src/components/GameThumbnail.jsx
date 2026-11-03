import React from 'react';

/**
 * Dedicated custom SVG artwork thumbnails for all 22 rehabilitation games.
 * Provides high-contrast, visually distinct, clinical & gaming artwork.
 */
export default function GameThumbnail({ gameId, className = "w-full h-full" }) {
  switch (gameId) {
    case 'gm_badminton':
      return (
        <svg viewBox="0 0 200 120" className={className} xmlns="http://www.w3.org/2000/svg">
          {/* Badminton Court */}
          <rect width="200" height="120" fill="#0d4a2b" rx="8" />
          <rect x="20" y="15" width="160" height="90" fill="none" stroke="#22c55e" strokeWidth="2" strokeOpacity="0.8" />
          <line x1="100" y1="15" x2="100" y2="105" stroke="#ffffff" strokeWidth="3" />
          {/* Net Mesh */}
          <line x1="20" y1="60" x2="180" y2="60" stroke="#ffffff" strokeWidth="2" strokeDasharray="3 3" />
          {/* Racquet */}
          <g transform="translate(60, 65) rotate(-25)">
            <ellipse cx="0" cy="-25" rx="14" ry="18" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
            <line x1="-8" y1="-25" x2="8" y2="-25" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.6" />
            <line x1="0" y1="-38" x2="0" y2="-12" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.6" />
            <line x1="0" y1="-7" x2="0" y2="25" stroke="#e2e8f0" strokeWidth="3" />
            <rect x="-2.5" y="16" width="5" height="14" fill="#f59e0b" rx="1.5" />
          </g>
          {/* Feathered Shuttlecock */}
          <g transform="translate(130, 45) rotate(45)">
            {/* Feathers */}
            <polygon points="-8,10 8,10 0,-4" fill="#f8fafc" />
            <line x1="-6" y1="7" x2="6" y2="7" stroke="#ef4444" strokeWidth="2" />
            {/* Cork */}
            <circle cx="0" cy="12" r="4.5" fill="#fde047" />
          </g>
          {/* Flight trajectory arc */}
          <path d="M 70 70 Q 100 20 130 45" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="2 3" strokeOpacity="0.7" />
        </svg>
      );

    case 'gm_cricket':
      return (
        <svg viewBox="0 0 200 120" className={className} xmlns="http://www.w3.org/2000/svg">
          {/* Turf Outfield */}
          <rect width="200" height="120" fill="#064e3b" rx="8" />
          {/* Pitch Strip */}
          <rect x="75" y="15" width="50" height="90" fill="#d97706" fillOpacity="0.9" rx="2" />
          <line x1="75" y1="85" x2="125" y2="85" stroke="#ffffff" strokeWidth="2" />
          <line x1="75" y1="35" x2="125" y2="35" stroke="#ffffff" strokeWidth="2" />
          {/* Wickets */}
          <g transform="translate(93, 20)">
            <rect x="0" y="0" width="2.5" height="16" fill="#fef08a" />
            <rect x="6" y="0" width="2.5" height="16" fill="#fef08a" />
            <rect x="12" y="0" width="2.5" height="16" fill="#fef08a" />
            <rect x="-1" y="-2" width="16" height="2" fill="#fef08a" />
          </g>
          {/* Cricket Bat */}
          <g transform="translate(100, 75) rotate(20)">
            <rect x="-5" y="-28" width="10" height="35" fill="#fed7aa" stroke="#9a3412" strokeWidth="1.5" rx="1" />
            <rect x="-2" y="7" width="4" height="16" fill="#ffffff" stroke="#dc2626" strokeWidth="1" rx="1" />
          </g>
          {/* Cricket Ball with Seam */}
          <g transform="translate(135, 55)">
            <circle cx="0" cy="0" r="8" fill="#dc2626" />
            <path d="M -5 -5 Q 0 0 5 5" stroke="#ffffff" strokeWidth="1.5" fill="none" strokeDasharray="1 1" />
          </g>
          <path d="M 100 35 Q 120 40 135 55" fill="none" stroke="#fca5a5" strokeWidth="1.5" strokeDasharray="2 2" />
        </svg>
      );

    case 'gm_basketball':
      return (
        <svg viewBox="0 0 200 120" className={className} xmlns="http://www.w3.org/2000/svg">
          {/* Hardwood Court */}
          <rect width="200" height="120" fill="#78350f" rx="8" />
          <rect x="10" y="10" width="180" height="100" fill="none" stroke="#92400e" strokeWidth="1.5" />
          {/* Key Line Arc */}
          <path d="M 60 120 A 40 40 0 0 1 140 120" fill="none" stroke="#f59e0b" strokeWidth="2" strokeOpacity="0.6" />
          {/* Backboard */}
          <rect x="70" y="18" width="60" height="36" fill="#ffffff" stroke="#dc2626" strokeWidth="2" fillOpacity="0.9" rx="2" />
          <rect x="85" y="32" width="30" height="18" fill="none" stroke="#dc2626" strokeWidth="2" />
          {/* Rim & Net */}
          <ellipse cx="100" cy="50" rx="14" ry="4" fill="none" stroke="#ea580c" strokeWidth="3" />
          <polygon points="87,50 92,68 108,68 113,50" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="3 2" />
          {/* Basketball */}
          <g transform="translate(145, 80)">
            <circle cx="0" cy="0" r="16" fill="#ea580c" />
            <path d="M -16 0 A 16 16 0 0 1 16 0" fill="none" stroke="#000000" strokeWidth="1.5" strokeOpacity="0.8" />
            <path d="M 0 -16 A 16 16 0 0 1 0 16" fill="none" stroke="#000000" strokeWidth="1.5" strokeOpacity="0.8" />
            <path d="M -11 -11 Q 0 0 11 11" fill="none" stroke="#000000" strokeWidth="1.5" strokeOpacity="0.8" />
          </g>
          {/* Arc Shot */}
          <path d="M 145 80 Q 125 30 100 48" fill="none" stroke="#fed7aa" strokeWidth="2" strokeDasharray="3 3" />
        </svg>
      );

    case 'gm_table_tennis':
      return (
        <svg viewBox="0 0 200 120" className={className} xmlns="http://www.w3.org/2000/svg">
          {/* Floor */}
          <rect width="200" height="120" fill="#0f172a" rx="8" />
          {/* 3D Perspective Ping Pong Table */}
          <polygon points="30,85 170,85 145,45 55,45" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
          <line x1="100" y1="45" x2="100" y2="85" stroke="#ffffff" strokeWidth="1.5" />
          {/* Net */}
          <line x1="42" y1="65" x2="158" y2="65" stroke="#ffffff" strokeWidth="3" strokeDasharray="2 2" />
          {/* Paddle 1 (Red) */}
          <g transform="translate(75, 90) rotate(15)">
            <circle cx="0" cy="-14" r="13" fill="#dc2626" stroke="#991b1b" strokeWidth="2" />
            <rect x="-2" y="-1" width="4" height="14" fill="#d97706" rx="1" />
          </g>
          {/* Orange Ball with Bounce Ring */}
          <circle cx="115" cy="58" r="4.5" fill="#f97316" />
          <ellipse cx="115" cy="64" rx="6" ry="2" fill="none" stroke="#fdba74" strokeWidth="1" strokeOpacity="0.7" />
          {/* Trajectory */}
          <path d="M 75 80 Q 95 48 115 58" fill="none" stroke="#fdba74" strokeWidth="1.5" strokeDasharray="2 2" />
        </svg>
      );

    case 'gm_bowling':
      return (
        <svg viewBox="0 0 200 120" className={className} xmlns="http://www.w3.org/2000/svg">
          {/* Maple Lane Floor */}
          <rect width="200" height="120" fill="#451a03" rx="8" />
          {/* Lane Perspective */}
          <polygon points="65,120 135,120 115,25 85,25" fill="#b45309" stroke="#d97706" strokeWidth="1" />
          {/* Guide Arrows */}
          <polygon points="100,75 97,80 103,80" fill="#78350f" />
          <polygon points="90,82 87,87 93,87" fill="#78350f" />
          <polygon points="110,82 107,87 113,87" fill="#78350f" />
          {/* Bowling Pins Triangle */}
          <g transform="translate(100, 30)">
            {/* Row 4 */}
            <circle cx="-12" cy="0" r="3" fill="#ffffff" stroke="#dc2626" strokeWidth="1" />
            <circle cx="-4" cy="0" r="3" fill="#ffffff" stroke="#dc2626" strokeWidth="1" />
            <circle cx="4" cy="0" r="3" fill="#ffffff" stroke="#dc2626" strokeWidth="1" />
            <circle cx="12" cy="0" r="3" fill="#ffffff" stroke="#dc2626" strokeWidth="1" />
            {/* Row 3 */}
            <circle cx="-8" cy="5" r="3" fill="#ffffff" stroke="#dc2626" strokeWidth="1" />
            <circle cx="0" cy="5" r="3" fill="#ffffff" stroke="#dc2626" strokeWidth="1" />
            <circle cx="8" cy="5" r="3" fill="#ffffff" stroke="#dc2626" strokeWidth="1" />
            {/* Row 2 */}
            <circle cx="-4" cy="10" r="3" fill="#ffffff" stroke="#dc2626" strokeWidth="1" />
            <circle cx="4" cy="10" r="3" fill="#ffffff" stroke="#dc2626" strokeWidth="1" />
            {/* Headpin */}
            <circle cx="0" cy="15" r="3.5" fill="#ffffff" stroke="#dc2626" strokeWidth="1" />
          </g>
          {/* Bowling Ball */}
          <g transform="translate(100, 100)">
            <circle cx="0" cy="0" r="14" fill="#0f172a" stroke="#334155" strokeWidth="2" />
            <circle cx="-4" cy="-4" r="1.5" fill="#ffffff" />
            <circle cx="2" cy="-5" r="1.5" fill="#ffffff" />
            <circle cx="-1" cy="2" r="1.5" fill="#ffffff" />
          </g>
        </svg>
      );

    case 'gm_balloon_pop':
      return (
        <svg viewBox="0 0 200 120" className={className} xmlns="http://www.w3.org/2000/svg">
          {/* Night Sky */}
          <rect width="200" height="120" fill="#090d1a" rx="8" />
          {/* Balloons */}
          <g transform="translate(45, 65)">
            <ellipse cx="0" cy="0" rx="12" ry="16" fill="#06b6d4" />
            <ellipse cx="-4" cy="-5" rx="3" ry="5" fill="#ffffff" fillOpacity="0.4" />
            <path d="M 0 16 Q 4 24 0 32" stroke="#94a3b8" strokeWidth="1" fill="none" />
          </g>
          <g transform="translate(90, 45)">
            <ellipse cx="0" cy="0" rx="14" ry="18" fill="#ec4899" />
            <ellipse cx="-4" cy="-6" rx="4" ry="6" fill="#ffffff" fillOpacity="0.4" />
            <path d="M 0 18 Q -4 28 0 38" stroke="#94a3b8" strokeWidth="1" fill="none" />
          </g>
          <g transform="translate(140, 70)">
            <ellipse cx="0" cy="0" rx="13" ry="17" fill="#f59e0b" />
            <ellipse cx="-4" cy="-5" rx="3" ry="5" fill="#ffffff" fillOpacity="0.4" />
            <path d="M 0 17 Q 5 26 0 34" stroke="#94a3b8" strokeWidth="1" fill="none" />
          </g>
          <g transform="translate(175, 40)">
            <ellipse cx="0" cy="0" rx="11" ry="14" fill="#10b981" />
            <ellipse cx="-3" cy="-4" rx="2.5" ry="4" fill="#ffffff" fillOpacity="0.4" />
            <path d="M 0 14 Q -3 22 0 28" stroke="#94a3b8" strokeWidth="1" fill="none" />
          </g>
          {/* Dart / Crosshair Target */}
          <g transform="translate(90, 45)">
            <circle cx="0" cy="0" r="10" fill="none" stroke="#ffffff" strokeWidth="2" strokeDasharray="3 3" />
            <line x1="-14" y1="0" x2="14" y2="0" stroke="#f43f5e" strokeWidth="2" />
            <line x1="0" y1="-14" x2="0" y2="14" stroke="#f43f5e" strokeWidth="2" />
          </g>
        </svg>
      );

    case 'gm_fruit_reach':
      return (
        <svg viewBox="0 0 200 120" className={className} xmlns="http://www.w3.org/2000/svg">
          {/* Orchard Sky */}
          <rect width="200" height="120" fill="#0f291e" rx="8" />
          {/* Tree Branch */}
          <path d="M 10 25 Q 70 35 190 20" stroke="#78350f" strokeWidth="8" strokeLinecap="round" fill="none" />
          <path d="M 80 30 Q 110 50 140 45" stroke="#78350f" strokeWidth="5" strokeLinecap="round" fill="none" />
          {/* Foliage leaves */}
          <ellipse cx="60" cy="18" rx="22" ry="12" fill="#166534" fillOpacity="0.8" />
          <ellipse cx="120" cy="20" rx="28" ry="14" fill="#15803d" fillOpacity="0.8" />
          <ellipse cx="170" cy="15" rx="20" ry="10" fill="#166534" fillOpacity="0.8" />
          {/* Apples & Oranges Hanging */}
          <g transform="translate(60, 42)">
            <line x1="0" y1="-14" x2="0" y2="0" stroke="#15803d" strokeWidth="2" />
            <circle cx="0" cy="6" r="9" fill="#dc2626" />
            <circle cx="-3" cy="3" r="2.5" fill="#fca5a5" />
          </g>
          <g transform="translate(110, 60)">
            <line x1="0" y1="-16" x2="0" y2="0" stroke="#15803d" strokeWidth="2" />
            <circle cx="0" cy="7" r="10" fill="#f97316" />
            <circle cx="-3" cy="4" r="2.5" fill="#fed7aa" />
          </g>
          <g transform="translate(160, 38)">
            <line x1="0" y1="-14" x2="0" y2="0" stroke="#15803d" strokeWidth="2" />
            <circle cx="0" cy="6" r="8" fill="#dc2626" />
          </g>
          {/* Harvest Basket below */}
          <g transform="translate(100, 102)">
            <polygon points="-24,-12 24,-12 18,12 -18,12" fill="#b45309" stroke="#78350f" strokeWidth="2" />
            <line x1="-12" y1="-12" x2="-8" y2="12" stroke="#78350f" strokeWidth="1.5" />
            <line x1="0" y1="-12" x2="0" y2="12" stroke="#78350f" strokeWidth="1.5" />
            <line x1="12" y1="-12" x2="8" y2="12" stroke="#78350f" strokeWidth="1.5" />
          </g>
        </svg>
      );

    case 'gm_target_shooting':
      return (
        <svg viewBox="0 0 200 120" className={className} xmlns="http://www.w3.org/2000/svg">
          {/* Range Backdrop */}
          <rect width="200" height="120" fill="#080e1a" rx="8" />
          {/* Grid lines */}
          <line x1="20" y1="60" x2="180" y2="60" stroke="#1e293b" strokeWidth="1" />
          <line x1="100" y1="15" x2="100" y2="105" stroke="#1e293b" strokeWidth="1" />
          {/* Concentric Target */}
          <circle cx="100" cy="60" r="42" fill="#0f172a" stroke="#334155" strokeWidth="2" />
          <circle cx="100" cy="60" r="32" fill="#1e293b" stroke="#0284c7" strokeWidth="2" />
          <circle cx="100" cy="60" r="22" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
          <circle cx="100" cy="60" r="12" fill="#dc2626" stroke="#f87171" strokeWidth="2" />
          <circle cx="100" cy="60" r="5" fill="#fde047" />
          {/* High-tech Reticle */}
          <g transform="translate(105, 56)">
            <circle cx="0" cy="0" r="14" fill="none" stroke="#10b981" strokeWidth="2" />
            <circle cx="0" cy="0" r="2" fill="#10b981" />
            <line x1="-18" y1="0" x2="-6" y2="0" stroke="#10b981" strokeWidth="2" />
            <line x1="6" y1="0" x2="18" y2="0" stroke="#10b981" strokeWidth="2" />
            <line x1="0" y1="-18" x2="0" y2="-6" stroke="#10b981" strokeWidth="2" />
            <line x1="0" y1="6" x2="0" y2="18" stroke="#10b981" strokeWidth="2" />
          </g>
        </svg>
      );

    case 'gm_baseball':
      return (
        <svg viewBox="0 0 200 120" className={className} xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="120" fill="#14532d" rx="8" />
          {/* Diamond Dirt */}
          <polygon points="100,20 160,65 100,110 40,65" fill="#b45309" fillOpacity="0.7" />
          {/* Home plate */}
          <polygon points="100,85 108,92 108,100 92,100 92,92" fill="#ffffff" />
          {/* Bat */}
          <g transform="translate(85, 75) rotate(-35)">
            <rect x="-4" y="-35" width="8" height="45" fill="#fde047" stroke="#ca8a04" strokeWidth="1.5" rx="2" />
            <rect x="-2" y="10" width="4" height="16" fill="#1e293b" rx="1" />
          </g>
          {/* Baseball */}
          <g transform="translate(130, 45)">
            <circle cx="0" cy="0" r="10" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
            <path d="M -7 -4 Q 0 0 -7 4" fill="none" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="1 1" />
            <path d="M 7 -4 Q 0 0 7 4" fill="none" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="1 1" />
          </g>
        </svg>
      );

    case 'gm_tennis':
      return (
        <svg viewBox="0 0 200 120" className={className} xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="120" fill="#1e3a8a" rx="8" />
          <rect x="25" y="15" width="150" height="90" fill="#1d4ed8" stroke="#ffffff" strokeWidth="2" />
          <line x1="100" y1="15" x2="100" y2="105" stroke="#ffffff" strokeWidth="2" />
          <line x1="25" y1="60" x2="175" y2="60" stroke="#ffffff" strokeWidth="3" strokeDasharray="2 2" />
          {/* Tennis Ball */}
          <circle cx="125" cy="40" r="9" fill="#a3e635" stroke="#65a30d" strokeWidth="1" />
          <path d="M 120 34 Q 125 40 120 46" fill="none" stroke="#ffffff" strokeWidth="1.5" />
          {/* Racket */}
          <g transform="translate(65, 80) rotate(30)">
            <ellipse cx="0" cy="-22" rx="14" ry="18" fill="none" stroke="#38bdf8" strokeWidth="3" />
            <line x1="0" y1="-4" x2="0" y2="24" stroke="#475569" strokeWidth="3.5" />
            <rect x="-2.5" y="14" width="5" height="14" fill="#0284c7" />
          </g>
        </svg>
      );

    case 'gm_virtual_catch':
      return (
        <svg viewBox="0 0 200 120" className={className} xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="120" fill="#091322" rx="8" />
          {/* Catching Glove Mitt */}
          <g transform="translate(90, 75)">
            <ellipse cx="0" cy="0" rx="22" ry="18" fill="#9a3412" stroke="#7c2d12" strokeWidth="2" />
            <circle cx="0" cy="-6" r="10" fill="#7c2d12" />
            <line x1="-12" y1="-8" x2="-4" y2="6" stroke="#fed7aa" strokeWidth="1.5" strokeDasharray="2 2" />
            <line x1="12" y1="-8" x2="4" y2="6" stroke="#fed7aa" strokeWidth="1.5" strokeDasharray="2 2" />
          </g>
          {/* Incoming Ball */}
          <circle cx="130" cy="35" r="9" fill="#f8fafc" stroke="#dc2626" strokeWidth="1.5" />
          <path d="M 160 20 Q 145 25 130 35" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />
        </svg>
      );

    case 'gm_object_sorting':
      return (
        <svg viewBox="0 0 200 120" className={className} xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="120" fill="#0f172a" rx="8" />
          {/* 3 Sorting Bins */}
          <rect x="25" y="70" width="40" height="36" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="2" rx="4" />
          <rect x="80" y="70" width="40" height="36" fill="#831843" stroke="#ec4899" strokeWidth="2" rx="4" />
          <rect x="135" y="70" width="40" height="36" fill="#064e3b" stroke="#10b981" strokeWidth="2" rx="4" />
          {/* Shapes to Sort */}
          <rect x="37" y="30" width="16" height="16" fill="#60a5fa" rx="2" />
          <circle cx="100" cy="38" r="9" fill="#f472b6" />
          <polygon points="155,28 165,48 145,48" fill="#34d399" />
          {/* Downward indicator */}
          <path d="M 100 48 L 100 62" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="2 2" />
        </svg>
      );

    case 'gm_virtual_painting':
      return (
        <svg viewBox="0 0 200 120" className={className} xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="120" fill="#18181b" rx="8" />
          {/* Easel Canvas */}
          <rect x="35" y="15" width="130" height="80" fill="#fafaf9" stroke="#d4d4d8" strokeWidth="2" rx="3" />
          {/* Painted Artistic Brush Stroke */}
          <path d="M 50 65 Q 90 25 120 60 T 150 40" fill="none" stroke="#06b6d4" strokeWidth="8" strokeLinecap="round" />
          <path d="M 55 75 Q 85 45 130 70" fill="none" stroke="#f43f5e" strokeWidth="6" strokeLinecap="round" />
          {/* Paintbrush */}
          <g transform="translate(145, 35) rotate(-45)">
            <rect x="-3" y="-20" width="6" height="26" fill="#71717a" rx="1" />
            <polygon points="-4,6 4,6 0,16" fill="#06b6d4" />
          </g>
        </svg>
      );

    case 'gm_memory_matching':
      return (
        <svg viewBox="0 0 200 120" className={className} xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="120" fill="#09111e" rx="8" />
          {/* Grid of memory cards */}
          {[
            { x: 30, y: 20, open: true, icon: 'A' },
            { x: 70, y: 20, open: false },
            { x: 110, y: 20, open: true, icon: 'A' },
            { x: 150, y: 20, open: false },
            { x: 30, y: 65, open: false },
            { x: 70, y: 65, open: true, icon: 'B' },
            { x: 110, y: 65, open: false },
            { x: 150, y: 65, open: true, icon: 'B' }
          ].map((c, i) => (
            <g key={i} transform={`translate(${c.x}, ${c.y})`}>
              <rect
                width="28" height="36" rx="4"
                fill={c.open ? '#0284c7' : '#1e293b'}
                stroke={c.open ? '#38bdf8' : '#334155'}
                strokeWidth="1.5"
              />
              {c.open && (
                <text x="14" y="24" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="bold">
                  {c.icon}
                </text>
              )}
            </g>
          ))}
        </svg>
      );

    case 'gm_rhythm_reaction':
      return (
        <svg viewBox="0 0 200 120" className={className} xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="120" fill="#080814" rx="8" />
          {/* Rhythm Lanes */}
          <line x1="50" y1="10" x2="50" y2="110" stroke="#1e1b4b" strokeWidth="2" />
          <line x1="100" y1="10" x2="100" y2="110" stroke="#1e1b4b" strokeWidth="2" />
          <line x1="150" y1="10" x2="150" y2="110" stroke="#1e1b4b" strokeWidth="2" />
          {/* Strike Target Bar */}
          <rect x="25" y="85" width="150" height="8" fill="#4338ca" rx="2" />
          {/* Falling Beats */}
          <circle cx="50" cy="89" r="9" fill="#06b6d4" stroke="#a5f3fc" strokeWidth="2" />
          <circle cx="100" cy="45" r="9" fill="#ec4899" stroke="#fbcfe8" strokeWidth="2" />
          <circle cx="150" cy="65" r="9" fill="#eab308" stroke="#fef08a" strokeWidth="2" />
        </svg>
      );

    case 'gm_hand_puzzle':
      return (
        <svg viewBox="0 0 200 120" className={className} xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="120" fill="#0f172a" rx="8" />
          {/* Puzzle Frame Outline */}
          <rect x="40" y="20" width="120" height="80" fill="#1e293b" stroke="#475569" strokeWidth="2" rx="4" />
          {/* Interlocking Pieces */}
          <rect x="50" y="30" width="45" height="30" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" rx="2" />
          <rect x="105" y="30" width="45" height="30" fill="#10b981" stroke="#34d399" strokeWidth="1.5" rx="2" />
          <rect x="50" y="65" width="45" height="25" fill="#f59e0b" stroke="#fbbf24" strokeWidth="1.5" rx="2" />
          <rect x="105" y="65" width="45" height="25" fill="#8b5cf6" stroke="#a78bfa" strokeWidth="1.5" rx="2" />
        </svg>
      );

    case 'gm_virtual_gardening':
      return (
        <svg viewBox="0 0 200 120" className={className} xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="120" fill="#052e16" rx="8" />
          {/* Planter Pot */}
          <polygon points="70,110 130,110 140,65 60,65" fill="#78350f" stroke="#9a3412" strokeWidth="2" />
          <rect x="55" y="60" width="90" height="8" fill="#9a3412" rx="2" />
          {/* Plant Stems and Flower */}
          <path d="M 100 60 Q 95 35 100 25" stroke="#16a34a" strokeWidth="3" fill="none" />
          <circle cx="100" cy="22" r="7" fill="#fde047" />
          {/* Petals */}
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <circle
              key={deg}
              cx={100 + Math.cos((deg * Math.PI) / 180) * 11}
              cy={22 + Math.sin((deg * Math.PI) / 180) * 11}
              r="4.5"
              fill="#ec4899"
            />
          ))}
          {/* Water Droplets */}
          <circle cx="120" cy="42" r="2.5" fill="#38bdf8" />
          <circle cx="124" cy="50" r="2" fill="#38bdf8" />
        </svg>
      );

    case 'gm_reach_stars':
      return (
        <svg viewBox="0 0 200 120" className={className} xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="120" fill="#030712" rx="8" />
          {/* Constellation line */}
          <path d="M 35 90 L 75 45 L 125 30 L 165 70" fill="none" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="3 3" />
          {/* Golden Stars */}
          {[
            { x: 35, y: 90, r: 6 },
            { x: 75, y: 45, r: 8 },
            { x: 125, y: 30, r: 10 },
            { x: 165, y: 70, r: 7 }
          ].map((s, idx) => (
            <g key={idx} transform={`translate(${s.x}, ${s.y})`}>
              <circle cx="0" cy="0" r={s.r + 3} fill="#eab308" fillOpacity="0.25" />
              <circle cx="0" cy="0" r={s.r} fill="#fde047" />
              <circle cx="0" cy="0" r={s.r * 0.4} fill="#ffffff" />
            </g>
          ))}
        </svg>
      );

    case 'gm_balance_challenge':
      return (
        <svg viewBox="0 0 200 120" className={className} xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="120" fill="#0f172a" rx="8" />
          {/* Tilting Tray Balance Beam */}
          <g transform="translate(100, 75) rotate(-6)">
            <rect x="-70" y="-5" width="140" height="10" fill="#334155" stroke="#64748b" strokeWidth="1.5" rx="2" />
            {/* Center target ring */}
            <circle cx="0" cy="0" r="10" fill="none" stroke="#10b981" strokeWidth="1.5" />
            {/* Rolling Silver Sphere */}
            <circle cx="8" cy="-14" r="9" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
            <circle cx="6" cy="-17" r="2.5" fill="#ffffff" />
          </g>
          {/* Fulcrum Base */}
          <polygon points="100,75 88,105 112,105" fill="#1e293b" stroke="#475569" strokeWidth="2" />
        </svg>
      );

    case 'gm_hand_grasp':
      return (
        <svg viewBox="0 0 200 120" className={className} xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="120" fill="#090d16" rx="8" />
          {/* Dynamometer Body */}
          <g transform="translate(100, 60)">
            <circle cx="0" cy="-12" r="28" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
            {/* Radial Dial Scale */}
            <path d="M -20 -12 A 20 20 0 0 1 20 -12" fill="none" stroke="#64748b" strokeWidth="3" />
            <path d="M -10 -28 A 20 20 0 0 1 14 -26" fill="none" stroke="#10b981" strokeWidth="3" />
            {/* Gauge Needle */}
            <line x1="0" y1="-12" x2="6" y2="-27" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
            {/* Grip Handles */}
            <rect x="-18" y="20" width="36" height="8" fill="#475569" rx="2" />
            <rect x="-14" y="32" width="28" height="6" fill="#0284c7" rx="2" />
          </g>
        </svg>
      );

    case 'gm_spatial_collection':
      return (
        <svg viewBox="0 0 200 120" className={className} xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="120" fill="#050a14" rx="8" />
          {/* 3D Receding Torus Rings */}
          <ellipse cx="100" cy="55" rx="60" ry="32" fill="none" stroke="#00f0ff" strokeWidth="2" strokeOpacity="0.8" />
          <ellipse cx="100" cy="55" rx="42" ry="22" fill="none" stroke="#38bdf8" strokeWidth="2" strokeOpacity="0.6" />
          <ellipse cx="100" cy="55" rx="24" ry="13" fill="none" stroke="#818cf8" strokeWidth="2" strokeOpacity="0.4" />
          {/* Center Guide Orb */}
          <circle cx="100" cy="55" r="9" fill="#fde047" stroke="#ffffff" strokeWidth="1.5" />
          <path d="M 60 75 Q 85 62 100 55" stroke="#fde047" strokeWidth="2" fill="none" strokeDasharray="2 3" />
        </svg>
      );

    case 'gm_fluid_motion':
      return (
        <svg viewBox="0 0 200 120" className={className} xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="120" fill="#042f2e" rx="8" />
          {/* Flowing Water Current Curves */}
          <path d="M 10 30 Q 60 10 110 40 T 190 25" fill="none" stroke="#14b8a6" strokeWidth="4" strokeLinecap="round" />
          <path d="M 10 60 Q 70 80 120 50 T 190 65" fill="none" stroke="#06b6d4" strokeWidth="5" strokeLinecap="round" />
          <path d="M 10 90 Q 50 70 100 95 T 190 85" fill="none" stroke="#2dd4bf" strokeWidth="4" strokeLinecap="round" />
          {/* River Stones */}
          <ellipse cx="80" cy="50" rx="12" ry="8" fill="#334155" />
          <ellipse cx="140" cy="75" rx="14" ry="9" fill="#1e293b" />
          {/* Floating Ripple */}
          <ellipse cx="120" cy="50" rx="16" ry="6" fill="none" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.7" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 200 120" className={className} xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="120" fill="#0b1324" rx="8" />
          <circle cx="100" cy="60" r="30" fill="#0284c7" fillOpacity="0.2" />
          <circle cx="100" cy="60" r="16" fill="#00d4ff" />
          <path d="M 75 60 L 125 60 M 100 35 L 100 85" stroke="#ffffff" strokeWidth="2" strokeDasharray="3 3" />
        </svg>
      );
  }
}

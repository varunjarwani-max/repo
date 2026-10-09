import React from 'react';

export const PileSceneSvg: React.FC<{ className?: string; viewBox?: string }> = ({
  className = '',
  viewBox = '0 0 1000 625',
}) => {
  return (
    <svg
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid slice"
      className={`w-full h-full select-none ${className}`}
      aria-label="Synthetic waste pile optical feed"
    >
      <defs>
        {/* Conveyor Belt Background Gradients */}
        <linearGradient id="conveyorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0B132B" />
          <stop offset="50%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#080E1E" />
        </linearGradient>

        <pattern id="conveyorTreads" width="40" height="40" patternUnits="userSpaceOnUse">
          <line x1="0" y1="40" x2="40" y2="0" stroke="#1E293B" strokeWidth="1.5" strokeOpacity="0.4" />
          <line x1="0" y1="20" x2="20" y2="0" stroke="#1E293B" strokeWidth="1" strokeOpacity="0.25" />
          <line x1="20" y1="40" x2="40" y2="20" stroke="#1E293B" strokeWidth="1" strokeOpacity="0.25" />
        </pattern>

        {/* Item Gradients */}
        {/* 1. Plastic Bottle PET */}
        <linearGradient id="petGrad" x1="0%" y1="0%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.6" />
          <stop offset="40%" stopColor="#0284C7" stopOpacity="0.4" />
          <stop offset="70%" stopColor="#BAE6FD" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#0369A1" stopOpacity="0.5" />
        </linearGradient>

        {/* 2. Apple Core */}
        <linearGradient id="appleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="50%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>

        {/* 3. Alkaline Battery */}
        <linearGradient id="batteryGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#B45309" />
          <stop offset="40%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#FDE68A" />
          <stop offset="80%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>

        {/* 4. Cardboard */}
        <linearGradient id="cardboardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#92400E" />
          <stop offset="50%" stopColor="#78350F" />
          <stop offset="100%" stopColor="#5B21B6" stopOpacity="0.1" />
        </linearGradient>

        {/* 5. Can Aluminium */}
        <linearGradient id="canGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="30%" stopColor="#94A3B8" />
          <stop offset="60%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>

        {/* 6. Foil Chip Packet */}
        <linearGradient id="foilGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C026D3" stopOpacity="0.8" />
          <stop offset="45%" stopColor="#E11D48" stopOpacity="0.8" />
          <stop offset="70%" stopColor="#CBD5E1" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>

        {/* 7. Glass Bottle */}
        <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#065F46" stopOpacity="0.75" />
          <stop offset="40%" stopColor="#10B981" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#A7F3D0" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#047857" stopOpacity="0.7" />
        </linearGradient>

        {/* 8. Banana Peel */}
        <linearGradient id="bananaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FACC15" />
          <stop offset="60%" stopColor="#EAB308" />
          <stop offset="90%" stopColor="#713F12" />
        </linearGradient>

        {/* 9. Foam Tray */}
        <linearGradient id="foamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F1F5F9" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#94A3B8" stopOpacity="0.85" />
        </linearGradient>

        {/* 10. Newspaper */}
        <linearGradient id="newsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="50%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>

        {/* 11. HDPE Detergent */}
        <linearGradient id="hdpeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#EA580C" />
          <stop offset="50%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#C2410C" />
        </linearGradient>

        {/* 12. Swollen Lithium Battery */}
        <linearGradient id="lithiumGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="30%" stopColor="#DC2626" stopOpacity="0.8" />
          <stop offset="70%" stopColor="#450A0A" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
      </defs>

      {/* Surface Base */}
      <rect width="1000" height="625" fill="url(#conveyorGrad)" />
      <rect width="1000" height="625" fill="url(#conveyorTreads)" />

      {/* Ambient Pile Mounds & Shadows */}
      <ellipse cx="500" cy="340" rx="440" ry="240" fill="#020617" opacity="0.65" filter="blur(25px)" />
      <path
        d="M80,380 Q320,180 520,240 T920,400 Q800,560 480,550 T80,380 Z"
        fill="#0B132B"
        opacity="0.8"
      />

      {/* ITEM #4: Cardboard piece (x: 380, y: 75, w: 220, h: 150) */}
      <g id="item-4-cardboard">
        <polygon
          points="390,85 590,78 610,195 430,220 385,160"
          fill="url(#cardboardGrad)"
          stroke="#B45309"
          strokeWidth="1.5"
        />
        {/* Corrugation lines */}
        <line x1="410" y1="95" x2="445" y2="210" stroke="#78350F" strokeWidth="1" strokeDasharray="3,3" />
        <line x1="450" y1="92" x2="485" y2="207" stroke="#78350F" strokeWidth="1" strokeDasharray="3,3" />
        <line x1="490" y1="88" x2="525" y2="204" stroke="#78350F" strokeWidth="1" strokeDasharray="3,3" />
        <line x1="530" y1="85" x2="565" y2="200" stroke="#78350F" strokeWidth="1" strokeDasharray="3,3" />
      </g>

      {/* ITEM #10: Newspaper (x: 50, y: 200, w: 240, h: 162) */}
      <g id="item-10-newspaper">
        <polygon
          points="60,205 275,210 288,335 125,360 55,290"
          fill="url(#newsGrad)"
          stroke="#64748B"
          strokeWidth="1"
        />
        <line x1="80" y1="225" x2="250" y2="228" stroke="#475569" strokeWidth="2" strokeDasharray="6,4" />
        <line x1="80" y1="240" x2="260" y2="243" stroke="#64748B" strokeWidth="1" strokeDasharray="4,2" />
        <line x1="80" y1="255" x2="255" y2="258" stroke="#64748B" strokeWidth="1" strokeDasharray="4,2" />
        <line x1="80" y1="270" x2="260" y2="273" stroke="#64748B" strokeWidth="1" strokeDasharray="4,2" />
      </g>

      {/* ITEM #9: Foam Tray (x: 720, y: 93, w: 200, h: 137) */}
      <g id="item-9-foam">
        <rect
          x="730"
          y="100"
          width="180"
          height="120"
          rx="12"
          fill="url(#foamGrad)"
          stroke="#CBD5E1"
          strokeWidth="1"
          transform="rotate(6 820 160)"
        />
        <rect
          x="745"
          y="115"
          width="150"
          height="90"
          rx="6"
          fill="#334155"
          fillOpacity="0.15"
          transform="rotate(6 820 160)"
        />
      </g>

      {/* ITEM #1: Plastic bottle (x: 120, y: 112, w: 180, h: 200) */}
      <g id="item-1-plastic-bottle">
        <rect
          x="145"
          y="130"
          width="130"
          height="160"
          rx="25"
          fill="url(#petGrad)"
          stroke="#38BDF8"
          strokeWidth="1.5"
          transform="rotate(-15 210 210)"
        />
        {/* Bottle neck & blue cap */}
        <rect
          x="195"
          y="110"
          width="30"
          height="28"
          rx="4"
          fill="#0284C7"
          stroke="#BAE6FD"
          strokeWidth="1"
          transform="rotate(-15 210 210)"
        />
        <line x1="165" y1="180" x2="255" y2="180" stroke="#E0F2FE" strokeWidth="1" strokeOpacity="0.6" transform="rotate(-15 210 210)" />
        <line x1="165" y1="210" x2="255" y2="210" stroke="#E0F2FE" strokeWidth="1" strokeOpacity="0.6" transform="rotate(-15 210 210)" />
        <line x1="165" y1="240" x2="255" y2="240" stroke="#E0F2FE" strokeWidth="1" strokeOpacity="0.6" transform="rotate(-15 210 210)" />
      </g>

      {/* ITEM #3: AA battery (Hazardous, x: 580, y: 137, w: 110, h: 100) */}
      <g id="item-3-battery">
        <rect
          x="590"
          y="145"
          width="90"
          height="75"
          rx="12"
          fill="url(#batteryGrad)"
          stroke="#F59E0B"
          strokeWidth="1"
          transform="rotate(25 635 185)"
        />
        {/* Terminal pip */}
        <rect
          x="675"
          y="172"
          width="12"
          height="22"
          rx="3"
          fill="#FDE68A"
          transform="rotate(25 635 185)"
        />
        <text
          x="610"
          y="190"
          fill="#FFF"
          fontSize="10"
          fontWeight="bold"
          fontFamily="monospace"
          transform="rotate(25 635 185)"
        >
          1.5V AA
        </text>
      </g>

      {/* ITEM #2: Apple core (x: 340, y: 237, w: 140, h: 112) */}
      <g id="item-2-apple">
        {/* Top/bottom skin remainder */}
        <ellipse cx="400" cy="245" rx="35" ry="12" fill="#DC2626" />
        <ellipse cx="400" cy="335" rx="35" ry="12" fill="#DC2626" />
        {/* Bitten core flesh */}
        <path
          d="M375,250 C388,275 388,305 375,330 L425,330 C412,305 412,275 425,250 Z"
          fill="url(#appleGrad)"
          stroke="#B45309"
          strokeWidth="0.8"
        />
        {/* Stem */}
        <path d="M400,245 Q405,230 415,225" stroke="#78350F" strokeWidth="2.5" fill="none" />
        {/* Seed */}
        <ellipse cx="395" cy="290" rx="3" ry="5" fill="#451A03" />
      </g>

      {/* ITEM #5: Aluminium can (x: 680, y: 262, w: 140, h: 137) */}
      <g id="item-5-can">
        <rect
          x="695"
          y="275"
          width="110"
          height="110"
          rx="18"
          fill="url(#canGrad)"
          stroke="#CBD5E1"
          strokeWidth="1.5"
          transform="rotate(-18 750 330)"
        />
        <ellipse cx="750" cy="285" rx="42" ry="14" fill="#94A3B8" transform="rotate(-18 750 330)" />
        <ellipse cx="750" cy="285" rx="15" ry="6" fill="#334155" transform="rotate(-18 750 330)" />
      </g>

      {/* ITEM #6: Chip packet (x: 160, y: 350, w: 160, h: 125) */}
      <g id="item-6-chip-packet">
        <polygon
          points="175,360 305,365 315,455 255,475 165,458"
          fill="url(#foilGrad)"
          stroke="#F43F5E"
          strokeWidth="1"
        />
        {/* Crimped top & bottom ridges */}
        <line x1="175" y1="365" x2="305" y2="370" stroke="#FFF" strokeWidth="1" strokeDasharray="2,2" />
        <line x1="165" y1="455" x2="315" y2="450" stroke="#FFF" strokeWidth="1" strokeDasharray="2,2" />
        <polygon points="210,395 270,390 280,430 220,435" fill="#FFF" fillOpacity="0.25" />
      </g>

      {/* ITEM #7: Glass bottle (x: 500, y: 325, w: 170, h: 212) */}
      <g id="item-7-glass-bottle">
        <rect
          x="530"
          y="350"
          width="110"
          height="160"
          rx="22"
          fill="url(#glassGrad)"
          stroke="#34D399"
          strokeWidth="1.5"
          transform="rotate(12 585 430)"
        />
        {/* Tapered glass neck */}
        <polygon
          points="565,350 605,350 595,310 575,310"
          fill="url(#glassGrad)"
          stroke="#34D399"
          strokeWidth="1.2"
          transform="rotate(12 585 430)"
        />
        <line x1="545" y1="380" x2="545" y2="490" stroke="#E6FFFA" strokeWidth="2.5" strokeOpacity="0.7" transform="rotate(12 585 430)" />
      </g>

      {/* ITEM #8: Banana peel (x: 300, y: 400, w: 180, h: 137) */}
      <g id="item-8-banana">
        <path
          d="M320,440 Q380,410 440,430 Q470,470 410,510 Q340,510 320,440 Z"
          fill="url(#bananaGrad)"
          stroke="#CA8A04"
          strokeWidth="1.5"
        />
        <path d="M430,425 Q450,440 455,470" stroke="#713F12" strokeWidth="3" fill="none" />
        <path d="M330,455 Q380,470 410,500" stroke="#A16207" strokeWidth="2" fill="none" />
      </g>

      {/* ITEM #11: HDPE Detergent bottle (x: 700, y: 406, w: 190, h: 175) */}
      <g id="item-11-detergent">
        <rect
          x="720"
          y="420"
          width="145"
          height="145"
          rx="24"
          fill="url(#hdpeGrad)"
          stroke="#F97316"
          strokeWidth="1.5"
          transform="rotate(-8 795 490)"
        />
        {/* Bottle handle cutout */}
        <rect
          x="740"
          y="450"
          width="25"
          height="60"
          rx="8"
          fill="#0B132B"
          transform="rotate(-8 795 490)"
        />
        {/* Cap */}
        <rect
          x="805"
          y="395"
          width="40"
          height="30"
          rx="6"
          fill="#3B82F6"
          stroke="#93C5FD"
          strokeWidth="1"
          transform="rotate(-8 795 490)"
        />
      </g>

      {/* ITEM #12: Swollen phone battery (Hazardous, x: 440, y: 475, w: 150, h: 100) */}
      <g id="item-12-swollen-battery">
        <rect
          x="455"
          y="485"
          width="120"
          height="80"
          rx="16"
          fill="url(#lithiumGrad)"
          stroke="#EF4444"
          strokeWidth="2"
        />
        {/* Swelling bloat contour */}
        <ellipse cx="515" cy="525" rx="45" ry="25" fill="#EF4444" fillOpacity="0.25" filter="blur(4px)" />
        <text
          x="475"
          y="520"
          fill="#FCA5A5"
          fontSize="10"
          fontWeight="bold"
          fontFamily="monospace"
        >
          ⚠ Li-ion 3.8V
        </text>
        <text
          x="475"
          y="535"
          fill="#F87171"
          fontSize="9"
          fontFamily="monospace"
        >
          DO NOT CRUSH
        </text>
        {/* Contact ribbon */}
        <rect x="445" y="505" width="12" height="18" fill="#F59E0B" rx="2" />
      </g>
    </svg>
  );
};

export default PileSceneSvg;

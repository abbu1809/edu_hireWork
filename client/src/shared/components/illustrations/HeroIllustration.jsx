/**
 * Decorative hero visual: stylised vacancy card, verified-teacher card and a
 * demo-scheduled chip in the brand's flat colour blocks (no gradients).
 * Purely decorative, so it is hidden from assistive technology.
 */
export default function HeroIllustration({ className }) {
  return (
    <svg className={className} viewBox="0 0 480 440" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      {/* Backdrop blocks */}
      <circle cx="300" cy="210" r="190" fill="#D4E9E2" />
      <circle cx="96" cy="356" r="56" fill="#EDEBE9" />
      <rect x="352" y="40" width="88" height="88" rx="44" fill="#1E3932" />
      <path d="M380 84l10 10 22-22" stroke="#CBA258" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />

      {/* Vacancy card */}
      <g>
        <rect x="56" y="70" width="272" height="168" rx="16" fill="#FFFFFF" />
        <rect x="56.5" y="70.5" width="271" height="167" rx="15.5" stroke="#000" strokeOpacity=".06" />
        <rect x="80" y="94" width="72" height="22" rx="11" fill="#EDEBE9" />
        <rect x="236" y="94" width="68" height="22" rx="11" fill="#FDE8E6" />
        <rect x="80" y="132" width="196" height="14" rx="7" fill="#1E3932" />
        <rect x="80" y="156" width="140" height="10" rx="5" fill="#000" fillOpacity=".18" />
        <rect x="80" y="180" width="224" height="34" rx="8" fill="#F2F0EB" />
        <rect x="92" y="192" width="92" height="10" rx="5" fill="#000" fillOpacity=".28" />
        <rect x="196" y="192" width="64" height="10" rx="5" fill="#006241" />
      </g>

      {/* Verified teacher card */}
      <g>
        <rect x="168" y="214" width="268" height="150" rx="16" fill="#FFFFFF" />
        <rect x="168.5" y="214.5" width="267" height="149" rx="15.5" stroke="#000" strokeOpacity=".06" />
        <circle cx="216" cy="262" r="26" fill="#D4E9E2" />
        <path d="M206 258a10 10 0 1 1 20 0 10 10 0 0 1-20 0Zm-6 22c3-7 9-10 16-10s13 3 16 10" fill="#006241" />
        <rect x="256" y="244" width="120" height="14" rx="7" fill="#1E3932" />
        <rect x="256" y="266" width="84" height="10" rx="5" fill="#000" fillOpacity=".2" />
        <rect x="192" y="304" width="88" height="24" rx="12" fill="#D4E9E2" />
        <path d="M204 316l5 5 9-9" stroke="#006241" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="224" y="312" width="44" height="8" rx="4" fill="#006241" />
        <rect x="290" y="304" width="122" height="34" rx="17" fill="#00754A" />
        <rect x="314" y="317" width="74" height="8" rx="4" fill="#FFFFFF" />
      </g>

      {/* Demo scheduled chip */}
      <g>
        <rect x="24" y="250" width="176" height="56" rx="28" fill="#1E3932" />
        <rect x="38" y="262" width="32" height="32" rx="16" fill="#CBA258" />
        <rect x="47" y="270" width="14" height="16" rx="2" stroke="#1E3932" strokeWidth="2.5" />
        <path d="M47 275h14" stroke="#1E3932" strokeWidth="2.5" />
        <rect x="80" y="266" width="96" height="9" rx="4.5" fill="#FFFFFF" />
        <rect x="80" y="282" width="64" height="8" rx="4" fill="#FFFFFF" fillOpacity=".55" />
      </g>

      {/* Sparkles */}
      <path d="M448 196l4 10 10 4-10 4-4 10-4-10-10-4 10-4 4-10Z" fill="#CBA258" />
      <path d="M40 140l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" fill="#00754A" />
    </svg>
  );
}

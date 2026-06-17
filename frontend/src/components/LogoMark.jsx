// Official SecureShare brand mark (shield + padlock).
//
// Single source of truth for the logo so every surface (Navbar, SharePage, …)
// renders the same current official mark — no stale bitmap copies. Accepts a
// className for per-context sizing and an aria-label override.
const LogoMark = ({ className, "aria-label": ariaLabel = "SecureShare" }) => (
  <svg
    className={className}
    viewBox="0 0 32 32"
    role="img"
    aria-label={ariaLabel}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="ssLogoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#ff8a00" />
        <stop offset="1" stopColor="#e52e71" />
      </linearGradient>
    </defs>
    {/* Shield */}
    <path
      d="M16 2.5l10.5 3.8v8.2c0 6.6-4.3 12.3-10.5 14.5C9.8 26.8 5.5 21.1 5.5 14.5V6.3L16 2.5z"
      fill="url(#ssLogoGrad)"
    />
    {/* Lock body */}
    <rect x="11" y="15" width="10" height="8" rx="1.8" fill="#fff" />
    {/* Lock shackle */}
    <path d="M12.7 15v-2.2a3.3 3.3 0 016.6 0V15" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    {/* Keyhole */}
    <circle cx="16" cy="18.4" r="1.4" fill="url(#ssLogoGrad)" />
    <rect x="15.4" y="18.4" width="1.2" height="2.6" rx="0.6" fill="url(#ssLogoGrad)" />
  </svg>
);

export default LogoMark;

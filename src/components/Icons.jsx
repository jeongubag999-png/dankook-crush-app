export const GenderFemaleIcon = () => (
  <svg width="28" height="28" viewBox="0 0 32 32">
    <circle cx="16" cy="17" r="11" fill="#8a5a44" />
    <circle cx="16" cy="15" r="8.5" fill="#ffe0c2" />
    <path
      d="M6.2 13.5c0-6 4.5-10 9.8-10s9.8 4 9.8 10c-2-2.5-5.8-4-9.8-4s-7.8 1.5-9.8 4z"
      fill="#8a5a44"
    />
    <circle cx="12.6" cy="15.5" r="1.1" fill="#2f2a28" />
    <circle cx="19.4" cy="15.5" r="1.1" fill="#2f2a28" />
    <circle cx="10.8" cy="18.3" r="1.4" fill="#ff9eb3" opacity="0.65" />
    <circle cx="21.2" cy="18.3" r="1.4" fill="#ff9eb3" opacity="0.65" />
    <path
      d="M13.3 19.3c1 1.1 4.4 1.1 5.4 0"
      stroke="#a8562f"
      strokeWidth="1.1"
      fill="none"
      strokeLinecap="round"
    />
    <path d="M16 3.6 12.8 5.8 16 7 19.2 5.8z" fill="#ff6f91" />
  </svg>
);

export const GenderMaleIcon = () => (
  <svg width="28" height="28" viewBox="0 0 32 32">
    <circle cx="16" cy="15" r="8.5" fill="#ffe0c2" />
    <path
      d="M7.3 14.2c0-5.4 3.9-9 8.7-9s8.7 3.6 8.7 9c-1.7-1.9-5-3-8.7-3s-7 1.1-8.7 3z"
      fill="#344054"
    />
    <circle cx="12.6" cy="15.5" r="1.1" fill="#2f2a28" />
    <circle cx="19.4" cy="15.5" r="1.1" fill="#2f2a28" />
    <circle cx="10.8" cy="18.1" r="1.2" fill="#9fc7ff" opacity="0.6" />
    <circle cx="21.2" cy="18.1" r="1.2" fill="#9fc7ff" opacity="0.6" />
    <path
      d="M13.3 19.2c1 1 4.4 1 5.4 0"
      stroke="#2f2a28"
      strokeWidth="1.1"
      fill="none"
      strokeLinecap="round"
    />
  </svg>
);

export const HomeIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
  </svg>
);

const outlineIconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const PlusIcon = ({ size = 22 }) => (
  <svg width={size} height={size} {...outlineIconProps}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const SearchIcon = ({ size = 22 }) => (
  <svg width={size} height={size} {...outlineIconProps}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.6-3.6" />
  </svg>
);

export const ListIcon = ({ size = 22 }) => (
  <svg width={size} height={size} {...outlineIconProps}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M8 9.5h8M8 13h8M8 16.5h5" />
  </svg>
);

export const PersonIcon = ({ size = 22 }) => (
  <svg width={size} height={size} {...outlineIconProps}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M5 20c1.4-3.6 4.2-5.4 7-5.4s5.6 1.8 7 5.4" />
  </svg>
);

export const BellIcon = ({ size = 22 }) => (
  <svg width={size} height={size} {...outlineIconProps}>
    <path d="M6 10.5a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14.5 6 10.5z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </svg>
);

export const CalendarIcon = ({ size = 22 }) => (
  <svg width={size} height={size} {...outlineIconProps}>
    <rect x="4" y="5.5" width="16" height="14.5" rx="3" />
    <path d="M4 10h16M8 3.5v3M16 3.5v3" />
  </svg>
);

export const ShieldCheckIcon = ({ size = 22 }) => (
  <svg width={size} height={size} {...outlineIconProps}>
    <path d="M12 3.5 5 6v6c0 4.6 3 7.8 7 8.5 4-0.7 7-3.9 7-8.5V6z" />
    <path d="m9 12 2 2 4-4.2" />
  </svg>
);

export const UsersIcon = ({ size = 22 }) => (
  <svg width={size} height={size} {...outlineIconProps}>
    <circle cx="9" cy="8.5" r="3" />
    <path d="M3.5 19c1-3 3-4.6 5.5-4.6s4.5 1.6 5.5 4.6" />
    <circle cx="17" cy="9.2" r="2.3" />
    <path d="M15.3 14.6c2 0.2 3.6 1.7 4.4 4.4" />
  </svg>
);

export const TrashIcon = ({ size = 22 }) => (
  <svg width={size} height={size} {...outlineIconProps}>
    <path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m3 0-.9 12.1a2 2 0 0 1-2 1.9H8.9a2 2 0 0 1-2-1.9L6 7" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

export const PaperPlaneIcon = ({ size = 22 }) => (
  <svg width={size} height={size} {...outlineIconProps}>
    <path d="m4 12 16-8-6.5 16-2.7-6.8L4 12z" />
    <path d="m10.8 13.2 3.7-3.7" />
  </svg>
);

export const ChatIcon = ({ size = 22 }) => (
  <svg width={size} height={size} {...outlineIconProps}>
    <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H9l-4 3.5V16H6.5A2.5 2.5 0 0 1 4 13.5z" />
  </svg>
);

export const ClockIcon = ({ size = 22 }) => (
  <svg width={size} height={size} {...outlineIconProps}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4.5l3 1.8" />
  </svg>
);

export const GearIcon = ({ size = 22 }) => (
  <svg width={size} height={size} {...outlineIconProps}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V20a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H4a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3H10.5a1.7 1.7 0 0 0 1-1.6V4a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9V10.5c.4.2 1.3.5 1.6 1H20a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.6 1z" />
  </svg>
);

export const ChevronRightIcon = ({ size = 20 }) => (
  <svg width={size} height={size} {...outlineIconProps}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);

export const CloudOutlineIcon = ({ size = 22 }) => (
  <svg width={size} height={size} {...outlineIconProps}>
    <path d="M7 18a4 4 0 0 1-.5-7.97 5 5 0 0 1 9.7-2.03A4.5 4.5 0 0 1 17 18H7z" />
  </svg>
);

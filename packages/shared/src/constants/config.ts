export const SOCIALS = {
  github: 'https://github.com/emircan-sahin/voca',
  linkedin: 'https://www.linkedin.com/in/emircan-sahin/',
  email: 'contact@usevoca.dev',
} as const;

export const DOWNLOADS = {
  windows: `${SOCIALS.github}/releases/latest/download/Voca-Setup.exe`,
  mac: `${SOCIALS.github}/releases/latest/download/Voca.dmg`,
} as const;

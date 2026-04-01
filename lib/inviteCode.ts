const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function genInviteCode(): string {
  let code = "WMNY-";
  for (let i = 0; i < 5; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

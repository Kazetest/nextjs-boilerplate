export const RESERVED_USERNAMES = new Set([
  "admin",
  "noai",
  "support",
  "help",
  "about",
  "api",
  "auth",
  "feed",
  "create",
  "post",
  "profile",
  "trend",
  "tag",
  "explore",
  "onboarding",
  "settings",
  "login",
  "logout",
  "signup",
  "me",
  "you",
  "system",
  "official",
]);

export function cleanUsername(value: string) {
  return value.toLowerCase().trim().replace(/^@/, "");
}

export function validateUsername(username: string) {
  if (username.length < 3 || username.length > 20) return "아이디는 3~20자";
  if (!/^[a-z0-9_]+$/.test(username)) return "영문 소문자, 숫자, _ 만 가능";
  if (username.startsWith("user_")) return "user_ 로 시작하는 아이디는 사용 불가";
  if (RESERVED_USERNAMES.has(username)) return "예약된 아이디입니다";
  return null;
}

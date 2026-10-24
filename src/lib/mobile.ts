// Detects phones/tablets from the User-Agent header. Used to keep the Sales
// dashboard laptop-only. (A User-Agent can be changed by whoever sends it, so
// this keeps the feature out of reach in normal use — it is not a security
// boundary. Real access control would need logins, which this app doesn't have.)
const MOBILE_UA = /Android|iPhone|iPad|iPod|Mobile|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i;

export function isMobileUserAgent(ua: string | null | undefined): boolean {
  return !!ua && MOBILE_UA.test(ua);
}

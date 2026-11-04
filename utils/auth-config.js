const ttlSeconds = Number(process.env.AUTH_TTL_SECONDS || 30);
if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 1) {
  throw new Error('AUTH_TTL_SECONDS phai la so nguyen duong');
}
const origin = process.env.APP_ORIGIN;
if (!origin || new URL(origin).origin !== origin) {
  throw new Error('APP_ORIGIN phai la origin khong co dau / cuoi');
}
module.exports = { ttlSeconds, origin };
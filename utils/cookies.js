const options = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/'
};
exports.setTokenCookie = (res, token) => {
  res.cookie('token', token, {
    ...options, maxAge: 24 * 60 * 60 * 1000
  });
};
exports.clearTokenCookie = (res) => {
  res.clearCookie('token', options);
};

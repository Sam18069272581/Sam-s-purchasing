// 返回当前用户的 openid（云开发自动注入，无需 AppSecret）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async () => {
  const { OPENID, UNIONID } = cloud.getWXContext();
  return { openid: OPENID, unionid: UNIONID || '' };
};

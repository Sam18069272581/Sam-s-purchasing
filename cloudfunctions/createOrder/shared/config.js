// 自动生成，请勿手改：由 scripts/sync-cloud.js 从 miniprogram/config.js 复制
// 全局配置：配送费规则在这里改，不需要动页面代码。
// 所有金额单位都是「分」，避免小数精度问题（1000 = ¥10.00）。
module.exports = {
  // 云开发环境 ID。留空则不使用云开发，订单只保存在本机（适合先本地预览）。
  cloudEnv: '',

  shopName: '山姆代购',

  // 配送费规则（2026-11-04 店主确认：每单 ¥3，目前没有免配送费）
  delivery: {
    baseFee: 300,           // 每单配送费 ¥3
    freeThreshold: 0,       // 满多少免配送费；0 表示没有免配送费。以后要做活动可改成如 19900（满 ¥199 免）
    // 按距离加价（目前关闭）：超出 includedKm 公里后每公里加 perKmFee。perKmFee 为 0 即不按距离收费。
    includedKm: 10,
    perKmFee: 0,
    maxFee: 0,              // 配送费上限；0 表示不封顶
    // 发货点（山姆门店或你的集货点）坐标，用来按直线距离估算公里数
    origin: { name: '山姆会员店（示例）', latitude: 30.5728, longitude: 104.0668 }
  },

  // 起送金额，低于此金额不能下单；0 表示不限制
  minOrderAmount: 0
};

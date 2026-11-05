// 把商品表、配送费规则、金额计算复制到云函数目录。
// 云函数单独部署，拿不到 miniprogram/ 里的文件，所以要一份副本，用来在服务端重新算价。
// 改了 miniprogram/data/products.js 或 config.js 之后运行：node scripts/sync-cloud.js
// （测试会检查副本是否最新，忘了同步 CI 会报错）
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const FILES = [
  ['miniprogram/data/products.js', 'cloudfunctions/createOrder/shared/products.js'],
  ['miniprogram/config.js', 'cloudfunctions/createOrder/shared/config.js'],
  ['miniprogram/utils/price.js', 'cloudfunctions/createOrder/shared/price.js']
];
const HEADER = '// 自动生成，请勿手改：由 scripts/sync-cloud.js 从 ';
function expected(src) { return HEADER + src + ' 复制\n' + fs.readFileSync(path.join(root, src), 'utf8'); }
if (require.main === module) {
  for (const [src, dst] of FILES) {
    fs.mkdirSync(path.dirname(path.join(root, dst)), { recursive: true });
    fs.writeFileSync(path.join(root, dst), expected(src));
    console.log('synced', dst);
  }
}
module.exports = { FILES, expected, root };

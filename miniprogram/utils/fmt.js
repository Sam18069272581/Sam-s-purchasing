// 价格拆成整数和小数两段，用于大小字号显示
function split(cents) {
  const s = (Math.round(cents) / 100).toFixed(2);
  const [i, d] = s.split('.');
  return { int: i, dec: '.' + d };
}
// 商品占位图的渐变色（按分类）
const GRADIENTS = {
  fruit: 'linear-gradient(135deg,#9BC7A4,#5E9C76)',
  meat: 'linear-gradient(135deg,#E3A48F,#B9644E)',
  dairy: 'linear-gradient(135deg,#EBCF9A,#C79A52)',
  snack: 'linear-gradient(135deg,#B6A9DA,#7D6BB5)',
  grain: 'linear-gradient(135deg,#D7BE9C,#A27F55)',
  daily: 'linear-gradient(135deg,#9FBEDD,#5B86B5)'
};
function gradient(catId) { return GRADIENTS[catId] || 'linear-gradient(135deg,#C9CED8,#8E97A8)'; }
module.exports = { split, gradient };

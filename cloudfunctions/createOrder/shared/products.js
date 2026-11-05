// 自动生成，请勿手改：由 scripts/sync-cloud.js 从 miniprogram/data/products.js 复制
// 示例商品数据。价格单位：分。image 可填 https 图片地址或 /images/xxx.png；留空显示占位色块。
// ⚠️ 价格和商品均为示例，请换成你实际代购的商品与价格（不要直接使用山姆官方图片，注意版权）。
const categories = [
  { id: 'fruit', name: '水果生鲜' },
  { id: 'meat', name: '肉禽蛋品' },
  { id: 'dairy', name: '乳品烘焙' },
  { id: 'snack', name: '零食饮料' },
  { id: 'grain', name: '粮油调味' },
  { id: 'daily', name: '日用百货' }
];

const products = [
  { id: 'p001', categoryId: 'fruit', name: '智利车厘子 JJ级', spec: '2.5kg/盒', price: 26900, image: '' },
  { id: 'p002', categoryId: 'fruit', name: '新西兰阳光金果', spec: '25粒/箱', price: 13900, image: '' },
  { id: 'p003', categoryId: 'fruit', name: '泰国金枕榴莲', spec: '约3kg/个', price: 18800, image: '' },
  { id: 'p004', categoryId: 'meat', name: '澳洲谷饲牛排', spec: '1.2kg/盒', price: 15900, image: '' },
  { id: 'p005', categoryId: 'meat', name: '冰鲜鸡全翅', spec: '1kg/盒', price: 4990, image: '' },
  { id: 'p006', categoryId: 'meat', name: '可生食鸡蛋', spec: '30枚/盒', price: 4590, image: '' },
  { id: 'p007', categoryId: 'dairy', name: '瑞士卷（原味）', spec: '16枚/盒', price: 5990, image: '' },
  { id: 'p008', categoryId: 'dairy', name: '全脂纯牛奶', spec: '1L×12盒', price: 7980, image: '' },
  { id: 'p009', categoryId: 'dairy', name: '麻薯面包', spec: '12个/袋', price: 3990, image: '' },
  { id: 'p010', categoryId: 'snack', name: '每日坚果', spec: '25g×30袋', price: 9990, image: '' },
  { id: 'p011', categoryId: 'snack', name: '苏打水', spec: '330ml×24罐', price: 4890, image: '' },
  { id: 'p012', categoryId: 'snack', name: '海苔脆片', spec: '400g/罐', price: 5590, image: '' },
  { id: 'p013', categoryId: 'grain', name: '东北五常大米', spec: '10kg/袋', price: 11900, image: '' },
  { id: 'p014', categoryId: 'grain', name: '特级初榨橄榄油', spec: '2L/瓶', price: 13900, image: '' },
  { id: 'p015', categoryId: 'grain', name: '零添加酱油', spec: '1.8L×2瓶', price: 4590, image: '' },
  { id: 'p016', categoryId: 'daily', name: '原生木浆抽纸', spec: '24包/提', price: 6990, image: '' },
  { id: 'p017', categoryId: 'daily', name: '洗衣凝珠', spec: '120颗/盒', price: 8990, image: '' },
  { id: 'p018', categoryId: 'daily', name: '厨房纸巾', spec: '12卷/提', price: 5490, image: '' }
];

module.exports = { categories, products };

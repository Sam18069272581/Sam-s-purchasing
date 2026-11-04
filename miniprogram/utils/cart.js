// 购物车：保存在本机缓存里
const KEY = 'cart_v1';

function load() {
  try { return wx.getStorageSync(KEY) || []; } catch (e) { return []; }
}
function save(list) {
  wx.setStorageSync(KEY, list);
  updateBadge(list);
}
function count(list) {
  return (list || load()).reduce((s, i) => s + i.qty, 0);
}
function updateBadge(list) {
  const n = count(list);
  if (n > 0) wx.setTabBarBadge({ index: 1, text: String(n > 99 ? '99+' : n) }).catch(() => {});
  else wx.removeTabBarBadge({ index: 1 }).catch(() => {});
}
function add(product, qty = 1) {
  const list = load();
  const hit = list.find(i => i.id === product.id);
  if (hit) hit.qty += qty;
  else list.push({ id: product.id, name: product.name, price: product.price, image: product.image, spec: product.spec, categoryId: product.categoryId, qty, checked: true });
  save(list);
  return list;
}
function setQty(id, qty) {
  let list = load();
  if (qty <= 0) list = list.filter(i => i.id !== id);
  else list.forEach(i => { if (i.id === id) i.qty = qty; });
  save(list);
  return list;
}
function toggle(id) {
  const list = load();
  list.forEach(i => { if (i.id === id) i.checked = !i.checked; });
  save(list);
  return list;
}
function toggleAll(checked) {
  const list = load();
  list.forEach(i => { i.checked = checked; });
  save(list);
  return list;
}
function removeChecked() {
  const list = load().filter(i => !i.checked);
  save(list);
  return list;
}
function qtyMap() {
  const m = {};
  load().forEach(i => { m[i.id] = i.qty; });
  return m;
}

module.exports = { load, save, add, setQty, toggle, toggleAll, removeChecked, count, updateBadge, qtyMap };

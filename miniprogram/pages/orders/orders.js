const order = require('../../utils/order.js');
const price = require('../../utils/price.js');

function fmt(ts) {
  const d = new Date(ts);
  const p = n => (n < 10 ? '0' + n : '' + n);
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

Page({
  data: { list: [] },
  onShow() {
    this.setData({
      list: order.list().map(o => Object.assign({}, o, {
        timeText: fmt(o.createdAt),
        totalText: price.formatYuan(o.totalAmount),
        feeText: price.formatYuan(o.deliveryFee),
        summaryText: o.items.map(i => i.name + '×' + i.qty).join('，')
      }))
    });
  }
});

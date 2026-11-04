// 静态检查：页面文件齐全、WXML 里绑定的事件在 JS 里都有、引用的图片都存在。
// 这类错误在开发者工具里只会在点到时才报，很容易漏。
const test = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { setup, MP } = require('../helpers/wx.js');

const app = JSON.parse(fs.readFileSync(path.join(MP, 'app.json'), 'utf8'));

test('app.json 里的每个页面都有 js / json / wxml / wxss', () => {
  for (const p of app.pages) for (const ext of ['js', 'json', 'wxml', 'wxss']) {
    assert.ok(fs.existsSync(path.join(MP, p + '.' + ext)), p + '.' + ext + ' 不存在');
  }
});

test('tabBar 页面都在 pages 里，图标文件都存在', () => {
  for (const t of app.tabBar.list) {
    assert.ok(app.pages.includes(t.pagePath), t.pagePath);
    assert.ok(fs.existsSync(path.join(MP, t.iconPath)), t.iconPath);
    assert.ok(fs.existsSync(path.join(MP, t.selectedIconPath)), t.selectedIconPath);
  }
});

test('所有 json 文件格式正确', () => {
  for (const p of app.pages) JSON.parse(fs.readFileSync(path.join(MP, p + '.json'), 'utf8'));
  JSON.parse(fs.readFileSync(path.join(MP, 'sitemap.json'), 'utf8'));
  JSON.parse(fs.readFileSync(path.join(MP, '..', 'project.config.json'), 'utf8'));
});

test('用到位置接口时已声明 requiredPrivateInfos 和权限说明', () => {
  const src = app.pages.map(p => fs.readFileSync(path.join(MP, p + '.js'), 'utf8')).join('\n');
  for (const api of ['chooseLocation', 'getLocation']) {
    if (src.includes('wx.' + api)) assert.ok((app.requiredPrivateInfos || []).includes(api), 'app.json 缺少 requiredPrivateInfos: ' + api);
  }
  if (src.includes('scope.userLocation')) assert.ok(app.permission && app.permission['scope.userLocation'].desc);
});

for (const route of app.pages) {
  test(route + '：WXML 绑定的事件处理函数都存在', () => {
    const env = setup();
    env.page; // 只加载定义，不跑生命周期
    let def = null;
    global.Page = d => { def = d; };
    require(path.join(MP, route + '.js'));
    const wxml = fs.readFileSync(path.join(MP, route + '.wxml'), 'utf8');
    const handlers = [...wxml.matchAll(/\b(?:bind|catch):?[a-z]+="([^"{}]+)"/g)].map(m => m[1]);
    for (const h of handlers) assert.strictEqual(typeof def[h], 'function', route + '.wxml 绑定了 ' + h + '，但 JS 里没有这个方法');
  });

  test(route + '：WXML 引用的本地图片都存在', () => {
    const wxml = fs.readFileSync(path.join(MP, route + '.wxml'), 'utf8');
    for (const m of wxml.matchAll(/['"](\/images\/[^'"]+)['"]/g)) assert.ok(fs.existsSync(path.join(MP, m[1])), m[1] + ' 不存在');
  });

  test(route + '：跳转的页面地址都存在，tab 页用 switchTab', () => {
    const js = fs.readFileSync(path.join(MP, route + '.js'), 'utf8');
    const tabs = app.tabBar.list.map(t => t.pagePath);
    for (const m of js.matchAll(/wx\.(navigateTo|redirectTo|switchTab)\(\{\s*url:\s*'\/([^'?]+)/g)) {
      assert.ok(app.pages.includes(m[2]), route + ' 跳转到不存在的页面 ' + m[2]);
      if (m[1] === 'switchTab') assert.ok(tabs.includes(m[2]), 'switchTab 只能跳 tab 页：' + m[2]);
      else assert.ok(!tabs.includes(m[2]), m[1] + ' 不能跳 tab 页，要用 switchTab：' + m[2]);
    }
  });
}

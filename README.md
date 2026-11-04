# 山姆代购微信小程序

面向山区用户的山姆会员店代购小程序（微信原生开发，无第三方依赖）。

功能：
- **商品**：左侧分类、右侧商品列表（图片、名称、规格、价格），搜索，直接加减数量，底部浮动购物车条（显示金额和"再买多少免配送费"）
- **购物车**：勾选/全选、加减数量、删除，实时显示商品金额、预估配送费、合计
- **结算**：收货地址、商品明细、商品总金额 + 配送费 = 应付总额，备注，提交订单
- **我的**：微信一键登录、头像昵称、收货地址（先授权位置并地图选点，再填姓名、电话、详细地址）、我的订单、联系代购员（客服）

## 运行
1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 导入本目录（`project.config.json` 所在目录）。没有 AppID 可先用"测试号"
3. 直接编译预览即可，默认不依赖云开发，购物车/地址/订单都存在本机
4. 计算逻辑单测：`node test/price.test.js`

## 配送费
当前规则（店主已确认）：**每单 ¥3，没有免配送费**。在 `miniprogram/config.js` 的 `delivery` 里改，单位为"分"：

| 字段 | 当前值 | 含义 |
|---|---|---|
| baseFee | 300 | 每单配送费 ¥3 |
| freeThreshold | 0 | 满多少免配送费，0 = 不免（以后做活动可填 19900 即满 ¥199 免） |
| includedKm / perKmFee | 10 / 0 | 按距离加价，perKmFee 为 0 表示关闭 |
| maxFee | 0 | 配送费封顶，0 = 不封顶 |
| origin | 示例坐标 | 发货点坐标，开启按距离加价时才用到 |

## 商品
在 `miniprogram/data/products.js` 修改分类和商品，`price` 单位为分，`image` 填图片 https 地址（需在小程序后台配置 downloadFile 合法域名）或放到 `miniprogram/images/`。示例商品和价格是虚构的，请换成你自己的。不要直接搬山姆官方 App/网站的图片和商标，可能有版权问题，建议自己拍照。

## 上线需要
- 注册小程序（个人主体即可，但个人主体不能开通微信支付和获取手机号）
- 在 `config.js` 填 `cloudEnv`，开通云开发，上传 `cloudfunctions/login` 和 `cloudfunctions/createOrder`，建 `orders` 集合。这样订单会集中存到云端，代购员可在云开发控制台查看
- 后台填写《用户隐私保护指引》，声明"位置信息"（地图选点）用途
- 当前不含在线支付，下单后由代购员联系确认、收款

## 开源参考与许可证
本项目代码为全新编写，**没有复制任何第三方代码**，只参考了以下开源项目的功能划分和页面结构（分类页左右布局、购物车底栏、结算页结构）：

| 项目 | 许可证 | 说明 |
|---|---|---|
| [EastWorld/wechat-app-mall](https://github.com/EastWorld/wechat-app-mall) | Apache-2.0 | 原生小程序商城，界面完整；但后端依赖第三方 SaaS（apifm），不适合直接拿来 |
| [linlinjava/litemall](https://github.com/linlinjava/litemall) | MIT | Spring Boot + 小程序全栈商城，功能全但对代购场景过重 |
| [tumobi/nideshop](https://github.com/tumobi/nideshop) | MIT | 服务端 API（Node.js）；其小程序前端仓库没有许可证 |
| [kuhami/wxbestcake-master](https://github.com/kuhami/wxbestcake-master) | MIT | 购物车 + 地址 + 下单流程的小型示例 |

位置授权、登录、头像昵称写法遵循微信官方文档。

# A股价值看板

展示 A 股关注清单、日线行情、最近七天统计、K 线、基本面评分和股息率参考价格。

## GitHub Pages 发布

- GitHub Actions 每天北京时间 16:30 获取最新行情并重新发布网站。
- 行情数据来自新浪财经公开行情接口。
- 推送到 `main` 分支后也会立即发布。
- 在仓库 `Settings → Pages` 中将来源设置为 `GitHub Actions`。

本地生成静态网站：

```bash
npm run pages:preview
```

生成结果位于 `out/`。

## 微信价格提醒

- 当前规则：中国移动收盘价不高于 90 元、云南白药收盘价不高于 50 元，或任一股票当日跌幅达到 3% 时提醒。
- GitHub Actions 在交易日收盘更新后自动检查，通过 Server酱推送到微信。
- 在 [Server酱 SendKey 页面](https://sct.ftqq.com/sendkey/)微信扫码登录并复制 SendKey。
- 打开仓库 `Settings → Secrets and variables → Actions`，新增名为 `SERVERCHAN_SENDKEY` 的 Repository secret。
- SendKey 只保存在 GitHub 私密设置中，不会出现在网站或代码里。

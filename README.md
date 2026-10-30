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

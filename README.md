# 宇宙回形针 · 暗黑中文本地版

在本目录运行：

```powershell
python -m http.server 8000 --bind 127.0.0.1 --directory public
```

打开 `http://127.0.0.1:8000/`，或直接打开 `public/index2.html`。使用本地服务可以获得更一致的自动存档行为。游戏运行所需的脚本、样式和结局音乐都已下载，不需要外网。

`upstream/` 保留通过 `curl` 下载的原始游戏、图片和音乐；`public/` 是暗黑中文版本，结局音乐位于 `public/assets/test.mp3`。`SOURCES.json` 记录来源与原始文件的 SHA-256。界面、96 个项目、策略、事件、战役地名、单位及结局均已汉化，股票代码保留原样。游戏数值、解锁条件和存档格式保持原样。原版的小屏幕手机版提示也予以保留。

本地版移除了 Google Analytics；手机版商店和纪念品商店链接仍指向原站提供的地址。存档保存在当前网址对应的 `localStorage` 中，本地副本不会自动读取原站域名下的进度。

运行无浏览器检查：

```powershell
node verify.cjs
```

检查覆盖本地资源、脚本语法、项目文本、DOM ID、原版逻辑结构，以及生产、锦标赛、供电、探索、战斗和存档往返。检查通过 Node VM 运行游戏脚本，没有使用浏览器；尚未进行浏览器视觉验收。

仓库：[qwq233/paperclip](https://github.com/qwq233/paperclip)（私有）。网站：[GitHub Pages](https://qwq233.github.io/paperclip/)（公开）。`.github/workflows/pages.yml` 在推送后先运行检查，再部署 `public/`。

原作：[Universal Paperclips](https://www.decisionproblem.com/paperclips/index2.html)，作者 Frank Lantz；战斗程序 Bennett Foddy；© 2017 Everybody House Games。音乐《Riversong》及其授权署名保留在原始文件和中文结局中。

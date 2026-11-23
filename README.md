# Our Little Universe

自动循环纪念相册。打开页面可看到封面和实时计时，点击开场后进入相册。双心、矩阵、球形、波浪长廊、圆环和半圆柱每 51 秒循环一轮。电脑同屏最多展示 36 张，手机每次最多展示 25 张大照片，随造型转场分批轮换。手机横屏将主要空间留给照片，音乐波形和文案放在底部。系统减少动态效果或 WebGL 不可用时显示照片墙。

## 本地预览

使用 Node.js 22.12+。首次运行时先安装依赖。

```sh
npm install
npm run prepare-media -- --dry-run
npm run prepare-media
npm run dev -- --host 127.0.0.1
```

## 素材与内容

- 正式照片在 `pictures/`，封面在 `important/`。`public/content.js` 中的 `photoSources` 按列出的顺序读取文件名，不含扩展名。JPG、JPEG 和 PNG 扩展名支持大小写。移除 `photoSources` 时，旧 `chapters` 的照片按章节顺序从 `originals/` 迁移读取。
- `coverSource` 指向开场最前方的封面。`opening` 可选填最多三个 `./media/` 下的图片路径，作为封面背后的卡片。
- 网页副本写入 `public/media/`。照片卡片自动校正方向并裁成 3:4，默认居中。单张照片可以写成 `{ file: 'DSC_8047', position: 'top' }`，支持 `top`、`bottom`、`left`、`right`。素材脚本去除 EXIF 和 XMP，保留原图。移除照片配置后，发布前检查并移走 `public/media/photos/` 中相应的旧网页副本。
- 立体舞台优先加载当前屏照片并预加载下一批，最多同时下载 4 张。请求超过 8 秒会取消，失败自动重试，之后再次轮到该照片或网络恢复时仍可重新加载。已成功下载的照片纹理会复用。
- 计时起点默认从 `startDate` 推导为上海当地当天零点。如需精确到其他时刻，可填写带时区的 `startInstant`，例如 `2025-12-14T00:00:00+08:00`。
- 音乐原文件和 LRC 歌词放在 `music/`。`npm run prepare-media` 将当前《Spring Rain》的 MP3 和 LRC 复制到 `public/media/music.mp3` 和 `public/media/lyrics.lrc`，`music` 与 `lyrics` 分别引用这两个路径。点击封面后播放，歌词跟随音乐时间切换，暂停和循环时保持同步；歌词不可用时保留原相册文案。原始音乐目录与网页素材副本均不提交到源码分支。
- 在 `timeline` 中按展示顺序填写 `{ date, title, description }`。日期可填 `YYYY.MM.DD` 或“未完待续”等展示文字。当前包含初遇、第一顿晚饭、确定关系、一百天纪念日、连云港旅行和一周年六个纪念节点，以及“未完待续”的未来寄语。

## 加密信件

在本机创建已被 Git 忽略的 `private/letter.txt`，用 UTF-8 填入正文和落款。接着在交互式终端执行以下命令。

```sh
node scripts/encrypt-letter.mjs
```

按提示输入两次口令。工具不回显口令，生成 `private/letter.encrypted.json`。将该 JSON 对象填入 `public/content.js` 的 `encryptedLetter`。重新加密前先移走上次的输出文件。信件未准备时保留 `null`。

公开页面通过 HTTPS 上的 Web Crypto 解密，本机可用回环地址预览。发布内容只需要密文及其算法参数，明文与口令留在本地。短口令可能被拿到密文的人离线尝试。

## 构建与发布

```sh
npm test
npm run prepare-media -- --dry-run
npm run build
npm run preview -- --host 127.0.0.1
```

`dist/` 是静态发布目录，通过 HTTP 或 HTTPS 访问。Three.js 在进入舞台时加载，构建默认会提示其独立块超过 500 KB。正式素材到齐后复查，再将 `dist/` 上传到已确认的静态托管项目。见[发布验收记录](docs/release-checklist.md)。

随机链接、`noindex` 和 `robots.txt` 只能降低被发现的概率。持链接者可以查看并保存网页照片。

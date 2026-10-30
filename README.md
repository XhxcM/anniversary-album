# Our First Anniversary

一周年纪念相册，起始日期为 2025-12-14，按上海自然日计数。Vue 管理界面，Three.js 管理照片舞台；无 WebGL 时使用普通照片墙。

## 本地运行

需要 Node.js 22.12+（当前验证为 Node.js 24）。首次执行 `npm install`，之后运行 `npm run dev -- --host 127.0.0.1`，访问终端输出的网址。

## 准备素材

原图仅存放在以下目录，不要改成输出目录：

```text
originals/
  cover.jpg
  01-故事开始/01.jpg
  02-平凡日常/01.jpg
  03-一起走过/01.jpg
  04-纪念日/01.jpg
```

每章按顺序使用 `01`、`02` 等不含扩展名的 basename；原图支持 JPG/JPEG/PNG，大小写扩展名均可。同一章节同一 basename 只保留一张。HEIC 请先导出为 JPG。

在 `public/content.js` 对应章节加入 `{ file: '01', caption: '' }`。运行 `npm run prepare-media -- --dry-run` 预览缺失素材（不写入且退出码为 0）；确认后运行 `npm run prepare-media`。

生成路径为 `public/media/photos/<folder>/thumb/<file>.webp` 和 `full/<file>.webp`，最长边分别为 512 和 1920 像素；`originals/cover.jpg` 生成最长边 2400 像素的 `public/media/cover.jpg`。自动校正方向并去除元数据，永不修改原图。命令逐项列出缺失或不支持的文件，实际处理遇错返回非零状态。

`originals/`、`public/media/`、`dist/` 已被 Git 忽略。音乐自行放在 `public/media/music.mp3`，缺失时不影响观看。

## 编辑内容

`public/content.js` 在页面启动前加载，替换后重新构建即可。此文件是公开的 JavaScript，不要放入密码、令牌或密钥；保留 `window.ALBUM_CONTENT = { ... };` 格式。

| 字段 | 用法 |
| --- | --- |
| `startDate` | `YYYY-MM-DD`，默认 `2025-12-14`；无效时隐藏天数并给出提示 |
| `timeZone` | 默认 `Asia/Shanghai`，计数按这个时区的自然日计算，与访问者所在地无关 |
| `cover` | `./media/cover.jpg`；缺失时显示黄昏色背景；设为 `null` 可省略 |
| `music` | `./media/music.mp3`；不需要音乐时设为 `null`；仅在开场按钮点击后播放 |
| `letter` | 普通文本，支持换行；空字符串不会留下空白告白框 |
| `chapters` | 固定四章，按配置数组顺序显示；第 4 章汇集所有照片形成双心 |
| `chapters[].id` | 唯一且稳定的章节标识，使用字母、数字、短横线或下划线 |
| `chapters[].title` | 章节标题，默认使用已确认的四个标题 |
| `chapters[].folder` | `originals/` 下的章节目录名；可使用中文、字母、数字、短横线、下划线 |
| `chapters[].photos` | 章节内有序照片数组；总计建议 40–60 张 |
| `photos[].file` | 不带扩展名的文件名，例如 `'01'`；每章内不可重复 |
| `photos[].caption` | 可选纯文本，仅在放大查看时展示；留空即可；不解析 HTML |

照片示例：

```js
photos: [
  { file: '01', caption: '' },
  { file: '02', caption: '一起走过的傍晚。' },
]
```

请使用 UTF-8 保存。每次更新照片，重新运行素材处理，再构建；直接编辑 `dist/content.js` 虽可临时生效，但下一次构建会覆盖，正式维护请改 `public/content.js`。

## 观看与兼容

开场按钮进入相册；滚轮、方向键、横向滑动或按钮切换章节。一次输入只前进一章，转场期间忽略重复输入；照片墙区域保留垂直滚动，可用章节按钮推进。第 4 章后显示结尾，点击“重新观看”回到第 1 章。

点击照片放大；Three.js 舞台也提供“浏览本章照片”按钮列表，便于键盘访问。放大后可用左右按钮、方向键、横向滑动切换，Esc 关闭并返回原焦点。音乐不因打开照片而暂停。

手机竖屏默认提示旋转，不能旋转时选择“仍然继续”。系统减少动态效果、WebGL 不可用、上下文丢失或持续低帧率时使用 DOM 照片墙。低帧率先降低像素比和可见照片数，再降级；照片墙保留全部照片。真实设备验收见 [发布检查表](docs/release-checklist.md)。

## 验证与构建

```sh
npm test
npm run build
npm run preview -- --host 127.0.0.1
```

`npm test` 覆盖上海日期边界、内容校验、无损原图处理、阵型、转场键、性能降级与导航。`dist/` 是静态发布产物，需通过 HTTP/HTTPS 打开，不能双击 `index.html` 作为 `file://` 页面运行。

Three.js 按进入相册时按需加载。构建中独立 Three.js 块约 538 KB（gzip 约 135 KB），会出现默认 500 KB 大小提示；它不是构建失败，开场和减少动态效果路径不加载该块。未引入额外运行时库来拆分引擎。

## Netlify 手动发布

1. 先补齐正式照片、封面、音乐和可选告白，完成素材处理、测试与构建。
2. 登录自己的 Netlify 项目，通过手动部署入口上传整个 `dist/` 目录；首次发布保留自动生成、无实际含义的网址。
3. 使用同一 Netlify 项目更新，避免每次产生新地址。
4. 在 HTTPS 地址上核对 `content.js`、`robots.txt`、封面和照片路径，点击开场验证音乐；在桌面、手机 Safari/Chrome 和微信实际打开。

本项目没有登录或访问控制。未公开的网址、`robots.txt` 和 `noindex, nofollow` 只降低被发现的概率，任何拿到链接的人都能查看。部署前确认照片与音乐可以分享。

实现参考：[Vue 文档](https://vuejs.org/guide/introduction.html)、[Vite 构建文档](https://vite.dev/guide/build)、[Three.js 渲染器文档](https://threejs.org/docs/pages/WebGLRenderer)。

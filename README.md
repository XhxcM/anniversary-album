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

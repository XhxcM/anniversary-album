# 自动循环纪念相册 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: 使用 `executing-plans` 按任务执行；执行前由用户审阅本计划。任务使用复选框跟踪。

**Goal:** 在现有相册工程上制作参考视频风格的自动循环纪念相册，支持微信横屏观看、时间线与加密信件。

**Architecture:** Vue 管理开场、计时器、弹窗及音乐，单一 Three.js 场景复用固定照片卡片并依据时间轴插值六种造型。内容配置与素材处理脚本提供统一照片池；信件通过单独的本地加密流程生成密文。

**Tech Stack:** Vue 3、Vite、Three.js、Node.js 22.12+、sharp、Web Crypto、Node 内置测试。

**Spec:** `docs/superpowers/specs/2026-11-06-looping-anniversary-album-design.md`

## Global Constraints

- 遵循已确认规格；主要设备为 iPhone 与安卓微信，电脑 Chrome/Edge 用于预览。
- 不添加不必要的运行时依赖；不重写无关代码；保留用户已有的 `public/content.js` 修改与原图。
- 敏感口令不出现在文档、命令参数、输出、版本库或构建产物中；原图与明文信件不发布。
- 视觉相似度为主观目标，需使用参考视频关键帧和正式素材检查，不能未经实测宣称 95%。
- 用户提供正式素材前使用明确标注的占位内容；不得用其他人的照片冒充用户照片。
- 任何提交或外部部署必须另行确认范围；本计划本身不授权发布。

## Review Focus

1. 空照片池或损坏图片：展示可理解占位，不崩溃（任务 1、3）。
2. 70–90 张素材及重复分配：所有照片至少一次、最多两次、抽取机会均等（任务 1）。
3. 微信横屏、全屏或音乐被拒：可手动旋转和播放，不能卡死（任务 4、5）。
4. 信件口令错误、密文损坏、再次打开：无明文泄露，提示且重新锁定（任务 6）。
5. WebGL 丢失、低帧率、减少动态效果、后台恢复：照片内容及入口仍可用（任务 3、4、7）。

## 文件职责

- `public/content.js`：起始时刻、照片来源、开场照片、音乐、时间线和加密信件数据；不得包含明文信件。
- `src/lib/content.js`、`src/lib/days.js`：配置验证、现有章节数据迁移、计时计算；新增 `src/lib/photo-pool.js` 管理固定卡片实例。
- `src/three/formations.js`、`src/three/album-scene.js`：六种阵型和复用卡片的平滑转场；新增 `src/three/loop-timeline.js` 管理确定性循环时间。
- `src/App.vue`、`src/components/`、`src/styles.css`：开场、横屏、计时、按钮、背景、音乐、弹窗与降级界面。
- `scripts/prepare-photos.mjs`：无损读取原图并生成网页副本；新增 `scripts/encrypt-letter.mjs` 生成加密信件数据。
- `tests/`：覆盖配置、照片池、时间、阵型、循环、素材和加密等逻辑；`README.md` 和 `docs/release-checklist.md` 更新维护与验收说明。

## 任务 1：内容与素材迁移

**文件：** `public/content.js`、`src/lib/content.js`、`src/lib/photo-pool.js`、`scripts/prepare-photos.mjs`、`.gitignore`、`tests/content.test.js`、`tests/prepare-photos.test.js`、`tests/photo-pool.test.js`。

**接口：** `normalizeAlbumContent(raw)` 返回安全配置及错误；`createPhotoPool(photos, targetCount, seed)` 返回具有稳定唯一实例键的照片数组；素材脚本接受统一照片列表并输出网页副本。

- [ ] 阅读并保留当前 `public/content.js` 的用户修改；定义兼容旧章节结构的读取迁移，将各章节照片按原顺序合并，暂不移动或改名原图。开场照片使用显式引用，缺失时使用占位。
- [ ] 先写照片池测试：70、80、90 张时目标 100 个实例；每张至少一次、最多两次、实例键唯一；同一输入与种子结果相同；空数组返回空数组。验证在不同种子下重复抽样机会均衡，使用固定种子集合与合理容差，避免随机测试偶发失败。
- [ ] 运行 `node --test tests/photo-pool.test.js`，确认新测试先失败；实现均匀无放回补足、固定映射与安全校验，再运行至通过。
- [ ] 更新内容与素材处理测试：旧章节配置可迁移、无效路径被拒、重复 basename 在不同目录可区分、原图不覆盖、缺图报告且不阻断其他项目。新增明文信件的忽略路径；处理后副本去除 EXIF。
- [ ] 更新配置、素材处理及其调用者；使用 `npm run prepare-media -- --dry-run` 检查现有素材，运行上述三个测试文件。不得直接覆盖或删除用户素材。

## 任务 2：时间与循环状态

**文件：** `src/lib/days.js`、`src/three/loop-timeline.js`、`tests/days.test.js`、`tests/loop-timeline.test.js`。

**接口：** `elapsedParts(startInstant, now)` 返回非负 `{ days, hours, minutes, seconds }` 或无效标记；`loopState(elapsedMs)` 返回 `{ formation, nextFormation, progress }`，暂停时调用方不增加有效播放时间。

- [ ] 先测试上海起始时刻、跨日、跨年、无效及未来起点；计时从绝对时间差计算而非每秒累加。
- [ ] 先测试六种阵型顺序、每个停留 6000 毫秒、过渡 2500 毫秒、51000 毫秒回到第一造型、边界值与暂停恢复。测试应精确断言阶段和过渡进度。
- [ ] 实现纯函数并运行 `node --test tests/days.test.js tests/loop-timeline.test.js`，确认全部通过。

## 任务 3：照片阵型与场景

**文件：** `src/three/formations.js`、`src/three/album-scene.js`、`src/three/transition-plan.js`、`src/components/AlbumStage.vue`、`tests/formations.test.js`、`tests/transition-plan.test.js`、`tests/frame-budget.test.js`。

**接口：** `createFormation(name, count, viewport)` 返回每个实例对应的有限坐标、旋转与缩放；`AlbumScene` 接收固定照片实例并根据任务 2 的状态更新目标，不因造型变化重建纹理。

- [ ] 为双心、矩阵、球形、波浪长廊、圆环、半圆柱六种阵型添加 0、1、70、100 张的坐标有限性、数量与确定性测试，验证首尾过渡复用相同实例；保留性能预算与纹理释放测试。
- [ ] 先运行相关测试确认缺失造型失败；实现各造型的 XYZ 深度、竖向 3:4 卡片和可见遮挡，按视频关键帧调整分布。照片切换期间只插值同一卡片的状态。
- [ ] 实现约 3 秒的指定照片堆展开；失效图片使用占位，低帧率逐级降低画质和可见数，WebGL 丢失回退照片墙。移除场景射线检测及照片选择接口，并同步清理调用者和旧测试。
- [ ] 运行 `node --test tests/formations.test.js tests/transition-plan.test.js tests/frame-budget.test.js`，检查 100 张纹理的释放及循环末尾衔接。

## 任务 4：开场、横屏与页面状态

**文件：** `src/App.vue`、`src/components/OpeningScreen.vue`、`src/components/LandscapeGate.vue`、`src/components/FallbackGallery.vue`、`src/styles.css`、`tests/navigation.test.js`。

**接口：** 页面状态至少覆盖等待点击、等待横屏、展开、循环；页面隐藏或竖屏暂停 3D 与循环计时，弹窗打开不暂停。

- [ ] 先测试状态变化：开场点击一次生效、控件点击不触发开场、竖屏不可进入、横屏恢复不重置、后台恢复不跳过造型；删除只适用于章节切换的旧断言。
- [ ] 点击手势中尝试全屏、横屏锁定与音乐播放，分别捕获拒绝；不支持时显示手动旋转提示，横屏后展开。避免把等待旋转后的异步操作假设成仍具有用户激活资格。
- [ ] 实现顶部实时计时器、中央照片堆、底部情话、点击后右下按钮错峰入场；背景星尘与鼠标/触摸爱心限量。触摸控件不产生粒子，减少动态时取消跟随粒子。
- [ ] 删除章节标题、前后按钮、灯箱和不再使用的调用；保留降级内容及键盘可达性。运行 `node --test tests/navigation.test.js` 与浏览器桌面、横竖屏尺寸检查。

## 任务 5：音乐与时间线

**文件：** `src/App.vue`、`src/components/`、`src/styles.css`、`public/content.js`，按需要增加对应测试。

**接口：** 音乐按钮在播放/暂停间切换并保留 `currentTime`；时间线条目包含展示日期、标题和说明，按配置顺序呈现。

- [ ] 验证音频缺失、播放 Promise 被拒、暂停后继续和结束循环；失败时提供可操作的播放按钮，不能阻断照片场景。
- [ ] 实现左下音乐按钮、播放状态关联的装饰波形及六条固定文案；弹窗不改变音乐或造型状态。
- [ ] 实现时间线弹窗、内部滚动、关闭焦点恢复、Esc 与未来节点；日期为展示文本，支持不精确日期。空列表不报错。

## 任务 6：加密信件

**文件：** `scripts/encrypt-letter.mjs`、`src/lib/letter-crypto.js`、`src/components/`、`public/content.js`、`.gitignore`、`tests/letter-crypto.test.js`。

**接口：** 加密产物包含算法版本、PBKDF2-SHA-256 参数及随机盐、AES-GCM IV 与密文；`decryptLetter(payload, password)` 返回正文或失败。加密与解密使用相同明确参数，口令仅通过不回显的交互输入获得。

- [ ] 先测试正确口令往返、错误口令与篡改密文均失败、随机盐/IV、无效结构安全失败；测试使用专门的虚构测试口令。
- [ ] 实现本地加密工具，从被忽略的本地文件读取正文，口令交互输入且不回显、不作为命令参数或环境变量、不记录；生成仅含密文及参数的数据。正式信件缺失时展示未准备提示，不用明文占位冒充密文。
- [ ] 实现密码弹窗，错误只提示“密码不对，再想想看”；关闭时清空输入、正文和密钥引用，重开必须重新输入。JavaScript 无法保证物理内存立即擦除。
- [ ] 运行 `node --test tests/letter-crypto.test.js`；构建后检查公开文件不包含测试明文或实际口令，检查时不得打印疑似秘密；不把真实信件写入测试夹具。

## 任务 7：整体验证与交付

**文件：** `README.md`、`docs/release-checklist.md`、相关测试与实现文件。

- [ ] 更新素材放置、裁切、加密信件、音乐、预览、构建及部署说明；说明随机链接并非访问控制，照片可被持链接者保存，短口令可被离线穷举。
- [ ] 运行 `npm test`、`npm run build`、`npm run prepare-media -- --dry-run`；记录通过结果、构建警告及缺失素材，失败先修复再继续。
- [ ] 对照参考视频关键帧检查六造型构图、照片密度、动画衔接、计时器、波形和按钮；检查空照片、缺图、无音乐、加密数据缺失、WebGL 降级、后台恢复。
- [ ] 在 iPhone 微信与安卓微信真机分别验证横屏提示、可用的全屏行为、音频启动/暂停、弹窗和流畅度；不可用时明确记录未验收，不以桌面模拟替代。
- [ ] 正式照片、开场合照、音乐、时间线和信件到位后重新处理、检查裁切及加密，完成真机复验。是否部署、目标账户与地址单独确认。

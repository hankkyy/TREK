# hanktrip.com — TREK 部署与维护文档

> 最后更新：2026-07-02 | 维护者：hankkyy

---

## 项目概述

基于 [mauriceboe/TREK](https://github.com/mauriceboe/TREK) v3.1.4 fork，自托管旅行规划器。

- **线上地址**：`https://hanktrip.com`
- **本地访问**：`http://localhost:3000`
- **源码仓库**：`https://github.com/hankkyy/TREK`
- **上游仓库**：`https://github.com/mauriceboe/TREK`
- **旧项目 (Hanoi 静态站)**：`https://github.com/hankkyy/trek-hanoi`（已废弃，Fly.io 配置已删除）
  - 原为单页 HTML（`Desktop/hanoi-vercel/index.html`），部署在 Vercel
  - 2026-07-02 迁移至 TREK 自托管方案
  - 旧数据在 CloudBase（`hanoi-d4gj8vd2q1e7a3dc0`），bucket_list / itinerary 等集合

## 本地环境

| 项目 | 路径 | 说明 |
|------|------|------|
| TREK 源码 | `~/Desktop/TREK/` | Docker 构建 + 源码修改 |
| Docker 数据 | `~/trek-data/data/` | SQLite + 日志 + 密钥 |
| Docker 上传 | `~/trek-data/uploads/` | 用户文件 |
| 旧 Hanoi 站 | `~/Desktop/hanoi-vercel/` | 已废弃，仅参考 |

---

## 部署架构

```
用户浏览器
    │
    ▼
https://hanktrip.com (Cloudflare DNS: 104.21.42.2 / 172.67.154.89)
    │
    ▼
Cloudflare Tunnel
    │
    ▼
本机 Docker Desktop → TREK 容器 :3000
```

### Docker 容器（本机 Mac）

```
镜像: hankkyy/trek:latest
容器名: trek
端口: 3000:3000
重启策略: unless-stopped
```

### Cloudflare Tunnel

Cloudflared 位于：`~/.hermes/profiles/backend-engineer/home/.local/bin/cloudflared`（版本 2026.6.1）

**⚠️ 已知问题：Mac 关机则站点下线**

TREK 运行在本机 Docker Desktop 上，依赖 Mac 保持开机。如果 Mac 休眠或关机，`hanktrip.com` 将不可访问。

**建议升级方案**（按推荐度排序）：
1. **Fly.io**（有免费额度）— 项目已在 trek-hanoi 中配过 fly.toml
2. **Oracle Cloud 永久免费 ARM VPS**（4 核 24GB）— 完全免费
3. **Railway / Render** — 简单部署，有免费层
4. **树莓派** — 放家里 24h 运行，功耗极低

### 数据目录（绝对不能删除）

| 路径 | 内容 |
|------|------|
| `~/trek-data/data/` | SQLite 数据库、日志、备份、密钥 |
| `~/trek-data/uploads/` | 用户上传的文件、封面、头像、照片 |
| `~/trek-data/data/travel.db` | 主数据库（所有行程、地点、用户数据） |

### 管理员账号

```
邮箱: admin@trek.local
密码: trekadmin2026
```

### 启动命令参考

```bash
docker run -d --name trek -p 3000:3000 \
  -e ENCRYPTION_KEY=<密钥> \
  -e ADMIN_EMAIL=admin@trek.local \
  -e ADMIN_PASSWORD=trekadmin2026 \
  -v ~/trek-data/data:/app/data \
  -v ~/trek-data/uploads:/app/uploads \
  --restart unless-stopped \
  hankkyy/trek:latest
```

---

## 已修复的 Bug（2026-07-02）

### Bug 1：地点描述和备注重复显示

**症状**：点击行程中的地点，描述（description）和备注（notes）显示相同内容两次。

**原因**：`PlaceInspector.tsx` 中，`place.description` 和 `place.notes` 分别渲染，但当 Google Places 导入或手动添加时，两个字段可能被填入相同内容。

**修复**：`client/src/components/Planner/PlaceInspector.tsx` 第 270 行

```diff
- {place.notes && (
+ {place.notes && place.notes.trim() !== (place.description || '').trim() && (
```

**Commit**: `303e9d5`

---

### Bug 2：Dashboard「已计划」显示"暂无旅行"

**症状**：首页能看到行程即将开始，但下方旅行列表「已计划」标签显示"暂无旅行，创建你的第一次旅行"。

**原因**：`useDashboard.ts` 中，spotlight（首页大幅展示的最近行程）会从 grid 列表中排除。当用户只有一个行程时，spotlight 独占后 grid 为空。

**修复**：`client/src/pages/dashboard/useDashboard.ts` 第 99 行

```diff
- const rest = spotlight ? trips.filter(t => t.id !== spotlight.id) : trips
+ const withoutSpotlight = spotlight ? trips.filter(t => t.id !== spotlight.id) : trips
+ const rest = withoutSpotlight.length > 0 ? withoutSpotlight : trips
```

逻辑：如果排除 spotlight 后 grid 为空，则保留 spotlight 在 grid 中。有多个行程时行为不变。

**Commit**: `303e9d5`

---

### Bug 3：管理后台地图预览 center 无法拖动

**症状**：管理后台 → 用户默认设置 → 地图模板 → 预览地图无法拖动来调整默认中心点。

**原因**：预览地图的 center 硬编码为 `[48.8566, 2.3522]`（巴黎），没有 `onViewportChange` 回调。

**修复**：`client/src/components/Admin/DefaultUserSettingsTab.tsx`

1. 添加 state：`previewCenter` 和 `previewZoom`
2. 传入 `onViewportChange` 回调实时更新坐标
3. 地图拖动/缩放时会更新 center state

**Commit**: `303e9d5`

---

### Bug 4：Atlas 显示 30 个城市（实际只有河内和下龙）

**症状**：Atlas 页统计显示 30 个城市，但用户只去了河内和下龙湾。

**原因**：`atlasService.ts` 的城市计数算法假设地址最后一部分是国家名，总是删除最后一部分。对于越南地址 `"1 Hoả Lò, Hoàn Kiếm, Hanoi"`，它错误地将 `Hanoi`（城市）当作"国家"删掉，然后将 `Hoàn Kiếm`（郡/区）计为一个"城市"。30 个地点分布在不同的郡，就变成了 30 个"城市"。

**修复**：`server/src/services/atlasService.ts` 第 420-436 行

```diff
- const candidates = parts.length >= 2 ? parts.slice(0, -1) : parts;
+ const lastIsCountry = parts.length >= 2 && getCountryFromAddress(place.address) !== null;
+ const candidates = lastIsCountry ? parts.slice(0, -1) : parts;
```

逻辑：先用已有的 `getCountryFromAddress()` 判断最后一部分是不是真正的国家名。只有确认是国家名时才删除，否则保留（视为城市名）。

**Commit**: `d1999cb`

---

## 代码改动概览

| 文件 | 改动 | Commit |
|------|------|--------|
| `client/src/components/Planner/PlaceInspector.tsx` | +1/-1 | `303e9d5` |
| `client/src/pages/dashboard/useDashboard.ts` | +2/-1 | `303e9d5` |
| `client/src/components/Admin/DefaultUserSettingsTab.tsx` | +7/-2 | `303e9d5` |
| `server/src/services/atlasService.ts` | +6/-5 | `d1999cb` |

总计：4 个文件，16 行新增，9 行删除。

---

## 如何更新部署

```bash
# 1. 进入项目目录
cd ~/Desktop/TREK

# 2. 拉取最新代码
git pull origin main

# 3. 构建新镜像
docker build --network=host -t hankkyy/trek:latest .

# 4. 停止旧容器，启动新容器（保持同样的 -v 挂载）
docker rm -f trek
docker run -d --name trek -p 3000:3000 \
  -e ENCRYPTION_KEY=<保持不变> \
  -e ADMIN_EMAIL=admin@trek.local \
  -e ADMIN_PASSWORD=trekadmin2026 \
  -v ~/trek-data/data:/app/data \
  -v ~/trek-data/uploads:/app/uploads \
  --restart unless-stopped \
  hankkyy/trek:latest

# 5. 检查日志
docker logs trek -f
```

> ⚠️ 只要 `-v ~/trek-data/data:/app/data` 和 `-v ~/trek-data/uploads:/app/uploads` 不变，所有数据永久保留。

---

## 升级上游版本

当 `mauriceboe/TREK` 发布新版本时：

```bash
# 1. 添加上游远程
git remote add upstream https://github.com/mauriceboe/TREK.git

# 2. 拉取上游
git fetch upstream
git merge upstream/main

# 3. 解决冲突（如有），重点关注我们改过的 4 个文件

# 4. 构建 + 部署（同上）
```

---

## 故障排查

### 站点无法访问
```bash
# 1. 检查 Docker 容器
docker ps | grep trek          # 状态应为 "healthy"

# 2. 检查本地是否可用
curl -sI http://localhost:3000 # 应返回 200 OK

# 3. 检查 Cloudflare Tunnel
#    确认 cloudflared 进程在运行（可能通过 Hermes 管理）
ps aux | grep cloudflared

# 4. 检查外网可达性
curl -sI https://hanktrip.com  # 应返回 200 OK
```

### 容器启动失败
```bash
docker logs trek           # 查看日志
docker inspect trek        # 查看配置
```

### 数据恢复
```bash
# 备份数据库
cp ~/trek-data/data/travel.db ~/trek-data/data/travel.db.bak.$(date +%Y%m%d)
```

### 重置管理员密码
```bash
# 删除数据库中的用户表会丢失所有数据，建议：
# 1. 在 TREK 管理后台直接修改
# 2. 或删除数据库重新初始化（会丢失数据！）
```

### 端口冲突
```bash
# 如果 3000 端口被占用
docker run ... -p 3001:3000 ...   # 改为主机端口 3001
```

---

## 相关链接

- 上游项目：https://github.com/mauriceboe/TREK
- Demo：https://demo.liketrek.com
- Docker Hub：https://hub.docker.com/r/mauriceboe/trek
- Discord：https://discord.gg/NhZBDSd4qW

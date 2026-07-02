# hanktrip.com — TREK 部署与维护文档

> 最后更新：2026-07-02 | 维护者：hankkyy  
> **唯一文档**：本文件是项目所有信息的唯一来源。旧 `trek-hanoi` 仓库已归档废弃。

---

## 在线访问

| 服务 | 地址 |
|------|------|
| TREK 主站 | https://hanktrip.com |
| 直连（不走 CDN） | http://147.224.9.74:3000 |

---

## 服务器

| 项目 | 详情 |
|------|------|
| 云平台 | Oracle Cloud Always Free |
| 区域 | us-sanjose-1 |
| 机型 | VM.Standard.E2.1.Micro（ARM，1 OCPU，1GB RAM + 2GB swap） |
| 系统 | Ubuntu 22.04.5 LTS |
| 磁盘 | 45GB（已用 7.5GB） |
| 公网 IP | `147.224.9.74` |
| SSH 连接 | `ssh -i ~/.ssh/trek-hanoi.key ubuntu@147.224.9.74` |
| SSH 密钥 | `~/.ssh/trek-hanoi.key`（RSA） |

---

## 部署架构

```
用户浏览器
    │
    ▼
https://hanktrip.com  ──── Cloudflare DNS (104.21.42.2 / 172.67.154.89)
    │
    ▼
Cloudflare Tunnel (cloudflared, 运行在 Oracle 实例上)
    │
    ▼
Docker: TREK 容器 (localhost:3000)
```

### Cloudflare Tunnel 配置

- **配置路径**：`/etc/cloudflared/config.yml`
- **Tunnel ID**：`518f0880-d85f-4edc-b02b-b40884ac35ac`
- **证书路径**：`/etc/cloudflared/518f0880-d85f-4edc-b02b-b40884ac35ac.json`
- **路由**：`hanktrip.com` 和 `trek.hanktrip.com` → `http://localhost:3000`
- **进程**：cloudflared 由 systemd 管理，开机自启

### Docker 容器

```
镜像: hankkyy/trek:latest
容器名: trek
端口: 3000:3000
数据卷: trek-data → /app/data, trek-uploads → /app/uploads
重启策略: Docker restart policy (--restart unless-stopped)
```

### 环境变量

| 变量 | 值 | 说明 |
|------|-----|------|
| `NODE_ENV` | `production` | 生产模式 |
| `ENCRYPTION_KEY` | `af8d6ed365...` | 数据加密密钥 |
| `ADMIN_EMAIL` | `hank.zihao@gmail.com` | 管理员邮箱 |
| `ADMIN_PASSWORD` | `123` | 管理员密码 |
| `COOKIE_SECURE` | `false` | ⚠️ 必须为 false，否则 HTTP 登录 cookie 被丢弃 |
| `ALLOW_PUBLIC_REGISTRATION` | `false` | 禁止公开注册 |

---

## 本地开发环境（Mac）

| 项目 | 路径 | 说明 |
|------|------|------|
| TREK 源码 | `~/Desktop/TREK/` | Git 仓库，修改后 push 到 GitHub |
| 本地 Docker | 不要用 | 本地只做代码修改和构建，不运行生产 |
| 生产 SSH | `ssh -i ~/.ssh/trek-hanoi.key ubuntu@147.224.9.74` | 连接 Oracle 服务器 |

---

## 数据备份

数据存储在 Oracle 实例的 Docker volumes 中：

```bash
# 查看数据
ssh -i ~/.ssh/trek-hanoi.key ubuntu@147.224.9.74
docker volume ls | grep trek
# trek-data → /app/data (SQLite 数据库 + 日志)
# trek-uploads → /app/uploads (用户文件)
```

**备份命令**：
```bash
# 备份到本地 Mac
ssh -i ~/.ssh/trek-hanoi.key ubuntu@147.224.9.74 "docker run --rm -v trek-data:/data -v trek-uploads:/uploads alpine tar czf /tmp/trek-backup.tar.gz /data /uploads"
scp -i ~/.ssh/trek-hanoi.key ubuntu@147.224.9.74:/tmp/trek-backup.tar.gz ~/trek-backup-$(date +%Y%m%d).tar.gz
```

---

## 行程数据

**🇻🇳 河内 × 下龙湾** · 2026年7月23日–26日 · 4天4晚

| 模块 | 数量 |
|------|------|
| 地点 | 72 |
| 日程 | 38 条 |
| 预订 | 4 项 |
| 预算 | 11 项 |
| 打包清单 | 13 项 |
| 打卡待办 | 55 项 |
| 笔记 | 9 篇 |

---

## Bug 修复记录

### Bug 1：地点描述和备注重复显示
- **文件**：`client/src/components/Planner/PlaceInspector.tsx`
- **Commit**：`303e9d5`
- **修复**：当 `place.notes` 与 `place.description` 完全相同时，跳过 notes 渲染

### Bug 2：Dashboard「已计划」显示"暂无旅行"
- **文件**：`client/src/pages/dashboard/useDashboard.ts`
- **Commit**：`303e9d5`
- **修复**：当排除 spotlight 行程后 grid 为空时，保留 spotlight 在 grid 中

### Bug 3：管理后台地图预览 center 无法拖动
- **文件**：`client/src/components/Admin/DefaultUserSettingsTab.tsx`
- **Commit**：`303e9d5`
- **修复**：添加 `previewCenter`/`previewZoom` state + `onViewportChange` 回调

### Bug 4：Atlas 显示 30 个城市（实际只有河内&下龙）
- **文件**：`server/src/services/atlasService.ts`
- **Commit**：`d1999cb`
- **修复**：先用 `getCountryFromAddress()` 判断地址最后部分是否为真正的国家名，只有确认时才删除，否则保留为城市名

### Bug 5：待办列表默认不按优先级排序
- **Commit**：`f92be06`
- **修复**：useTodoList 默认按优先级排序

### Bug 6：Admin 地图预览 marker 不跟随拖拽 + 桌面端点击跳跃
- **文件**：`client/src/components/Admin/DefaultUserSettingsTab.tsx` + `client/src/components/Map/MapView.tsx`
- **修复**：新增 mapCenter 状态分离 marker 和地图居中逻辑；添加 onViewportChange 追踪拖拽；新增 preserveZoom 属性避免缩放重置

### Bug 7：中文翻译大量缺漏（80+ 处）
- **文件**：`shared/src/i18n/zh/*`（admin/settings/oauth/journey/dayplan/reservations/trip/notif/places/memories/system_notice）+ `server/src/services/passwordPolicy.ts` + `server/src/services/authService.ts`
- **修复**：补全所有用户可见界面的中文翻译（Vacay→假期, Atlas→地图集, Collab→协作, Journey→旅程, Costs→费用 等）+ 密码验证和认证相关错误消息中文化

### 优化：Dashboard 默认时区增加越南
- **Commit**：本次
- **修复**：DEFAULT_ZONES 加入 `Asia/Ho_Chi_Minh`（越南 GMT+7）

---

## 如何部署更新

### 方法 1：从 Mac 构建并推送到 Oracle（推荐）

```bash
# 1. 本地构建
cd ~/Desktop/TREK
git pull origin main
docker build --network=host -t hankkyy/trek:latest .

# 2. 导出并传输到 Oracle
docker save hankkyy/trek:latest | gzip > /tmp/trek-image.tar.gz
scp -i ~/.ssh/trek-hanoi.key /tmp/trek-image.tar.gz ubuntu@147.224.9.74:/tmp/

# 3. 在 Oracle 上加载并重启
ssh -i ~/.ssh/trek-hanoi.key ubuntu@147.224.9.74 "
  docker load < /tmp/trek-image.tar.gz
  docker stop trek && docker rm trek
  docker run -d --name trek -p 3000:3000 \
    -e ENCRYPTION_KEY=af8d6ed365a04e9bf46be39d049359d284297c1160fdd6648e3e28b63d29bd87 \
    -e NODE_ENV=production \
    -e COOKIE_SECURE=false \
    -e ADMIN_EMAIL=hank.zihao@gmail.com \
    -e ADMIN_PASSWORD=123 \
    -e ALLOW_PUBLIC_REGISTRATION=false \
    -v trek-data:/app/data \
    -v trek-uploads:/app/uploads \
    --restart unless-stopped \
    hankkyy/trek:latest
  rm /tmp/trek-image.tar.gz
"
```

### 方法 2：直接在 Oracle 上构建

```bash
# Oracle 实例 RAM 只有 1GB，构建时需启用 swap
ssh -i ~/.ssh/trek-hanoi.key ubuntu@147.224.9.74
git clone https://github.com/hankkyy/TREK.git /tmp/trek-build
cd /tmp/trek-build
docker build -t hankkyy/trek:latest .
# 然后同上重启容器
```

---

## 上游升级

当 `mauriceboe/TREK` 发布新版本时：

```bash
cd ~/Desktop/TREK
git fetch upstream main  # 或从 mauriceboe/TREK 拉取
git merge upstream/main
# 解决冲突（重点关注我们改过的 4 个文件）
# 构建 + 部署（见上）
```

---

## 故障排查

### 站点无法访问
```bash
# 1. 检查 Oracle 实例是否在线
ssh -i ~/.ssh/trek-hanoi.key ubuntu@147.224.9.74 "docker ps | grep trek"
# 2. 检查 Cloudflare Tunnel
ssh -i ~/.ssh/trek-hanoi.key ubuntu@147.224.9.74 "systemctl status cloudflared"
# 3. 检查本地可达性
curl -sI http://147.224.9.74:3000
# 4. 检查域名可达性
curl -sI https://hanktrip.com
```

### RAM 不足导致 Docker 构建失败
```bash
# Oracle 实例上启用 2GB swap
ssh -i ~/.ssh/trek-hanoi.key ubuntu@147.224.9.74
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
```

### Docker 数据卷位置
```bash
# 查看实际存储路径
docker volume inspect trek-data | grep Mountpoint
# 通常在 /var/lib/docker/volumes/trek-data/_data/
```

---

## 关联项目（历史）

| 项目 | 状态 |
|------|------|
| `hankkyy/TREK` | ✅ 当前，活跃维护 |
| `mauriceboe/TREK` | 上游源，只读 |
| `hankkyy/trek-hanoi` | ❌ 已归档废弃，所有信息已迁移至本文档 |
| `hankkyy/hanoi-trip`（hanoi-vercel） | ❌ 旧静态站，已迁移至 TREK |
| CloudBase `hanoi-d4gj8vd2q1e7a3dc0` | 旧数据库，保留但不再使用 |

---

## ⚠️ 重要注意事项

1. **COOKIE_SECURE=false**：Oracle 实例只有 HTTP（没有 TLS 证书），必须设为 false，否则登录后 cookie 被浏览器丢弃
2. **Cloudflare 提供 HTTPS**：用户访问 hanktrip.com 通过 Cloudflare 的 HTTPS，内部 Oracle ↔ Cloudflare 通过 Cloudflare Tunnel 加密
3. **1GB RAM 限制**：Oracle 永久免费实例内存紧张，构建镜像建议在 Mac 上完成再传过去
4. **数据备份**：定期备份 `trek-data` 和 `trek-uploads` volumes

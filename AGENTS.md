# AGENTS.md — AI Agent 入口文档

> **先读这个，再读 [DEPLOYMENT.md](./DEPLOYMENT.md)**

## 这是什么项目

自托管旅行规划器 [TREK](https://github.com/mauriceboe/TREK)，部署在 `hanktrip.com`。

## 快速了解

```bash
# 源码
git clone https://github.com/hankkyy/TREK.git

# 生产服务器（Oracle Cloud）
ssh -i ~/.ssh/trek-hanoi.key ubuntu@147.224.9.74
docker ps | grep trek   # 应是 hankkyy/trek:latest-amd64, healthy

# 线上
curl -sI https://hanktrip.com  # HTTP 200
```

## 我们已经修过的 Bug（4个）

| # | Bug | 文件 | Commit |
|---|-----|------|--------|
| 1 | 地点描述和备注重复 | `client/.../PlaceInspector.tsx` | `303e9d5` |
| 2 | Dashboard"已计划"空 | `client/.../useDashboard.ts` | `303e9d5` |
| 3 | Admin 地图预览增强 | `client/.../DefaultUserSettingsTab.tsx` + `MapView.tsx` | `25a3daa`, `eff9581`, `最新` |
| 4 | Atlas 城市数错误 | `server/.../atlasService.ts` | `4bf3688` |
| 5 | 待办列表默认优先级排序 | `client/.../useTodoList.ts` | `f92be06` |
| 6 | 版本号 vdev→3.1.4 | Dockerfile build-arg | 构建参数 |

## 部署方式

**永远不要在 Mac 本地跑生产**。Mac 只用于改代码、构建 AMD64 镜像、推到 Oracle。

```bash
# 构建（Mac ARM → AMD64 交叉编译）
docker build --platform linux/amd64 --build-arg APP_VERSION=3.1.4 -t hankkyy/trek:latest-amd64 .

# 传到 Oracle
docker save hankkyy/trek:latest-amd64 | gzip > /tmp/trek-amd64.tar.gz
scp -i ~/.ssh/trek-hanoi.key /tmp/trek-amd64.tar.gz ubuntu@147.224.9.74:/tmp/

# 部署（保留数据卷！）
ssh -i ~/.ssh/trek-hanoi.key ubuntu@147.224.9.74
docker load < /tmp/trek-amd64.tar.gz
docker stop trek && docker rm trek
docker run -d --name trek -p 3000:3000 \
  -e ENCRYPTION_KEY=af8d6ed365a04e9bf46be39d049359d284297c1160fdd6648e3e28b63d29bd87 \
  -e NODE_ENV=production -e COOKIE_SECURE=false \
  -e ADMIN_EMAIL=hank.zihao@gmail.com -e ADMIN_PASSWORD=123 \
  -e ALLOW_PUBLIC_REGISTRATION=false \
  -v trek-data:/app/data -v trek-uploads:/app/uploads \
  --restart unless-stopped hankkyy/trek:latest-amd64
```

## ⚠️ 绝对不能做的事

1. **不要点 TREK 后台的「更新」按钮** — 会拉取上游 mauriceboe/trek，覆盖所有修复
2. **不要删除 Docker volumes**（trek-data, trek-uploads）— 所有用户数据
3. **不要用 `--platform` 之外的架构构建** — Mac 是 ARM，Oracle 是 AMD64

## 完整文档

→ **[DEPLOYMENT.md](./DEPLOYMENT.md)** — 服务器配置、Cloudflare Tunnel、数据备份、故障排查

# Prokcy

中文 · [English](./README-en_US.md)

Prokcy 是一款跨平台桌面网络调试代理工具，提供现代化 GUI 界面来捕获、检查和操控 HTTP/HTTPS 网络请求。底层基于 [whistle](https://github.com/avwo/whistle) 代理引擎，上层使用 Electron + React + TailwindCSS + Monaco Editor 构建了全新的风格界面。

支持以下系统：
- macOS（Apple Silicon / Intel）
- Windows
- Linux（Fedora / Ubuntu）

> 若运行环境无图形界面（如服务器或特殊设备），请改用 [whistle 命令行版本](https://wproxy.org/whistle/)。

## 界面预览

| Network | Rules |
|------|------|
| ![Network tab screenshot](./docs/images/readme/network-tab.png) | ![Rules tab screenshot](./docs/images/readme/rules-tab.png) |

| Values | Settings |
|------|------|
| ![Values tab screenshot](./docs/images/readme/values-tab.png) | ![Settings tab screenshot](./docs/images/readme/settings-tab.png) |

## 核心功能

### Network — 网络抓包

瀑布流时间线 + 请求检查器的分屏布局，实时捕获经过代理的所有网络请求。

- **瀑布流时间线**：每个请求以水平条形展示，按阶段着色（DNS 蓝色、TCP 青色、TLS 绿色、TTFB 紫色、Download 橙色）
- **请求检查器**：支持 Headers、Body、Response、Timeline、Rules 多个标签页，JSON 自动语法高亮
- **虚拟化列表**：大量请求下依然流畅，列表表头（Method / Status / URL / Size / Time / Waterfall）与内容对齐
- **请求过滤**：在 Settings → Network 中配置过滤规则，支持域名、路径和通配符匹配

### Rules — 规则编辑

Monaco Editor + 规则分组面板的双栏布局，使用 whistle 规则语法来转发、mock 或修改请求。

- **自定义语法高亮**：为 whistle 规则语法定制了 Monaco 语言定义，协议关键字、模式匹配、注释均有独立着色
- **规则分组管理**：支持创建、重命名、删除分组，拖拽排序调整优先级
- **多组同时生效**：可启用多个规则组，优先级按列表从上到下（`#1` > `#2` > ...）
- **快捷键**：`Cmd/Ctrl+S` 保存，`Cmd/Ctrl+/` 切换注释

### Values — 键值存储

双栏布局（左侧键列表 + 右侧 Monaco 编辑器），管理 JSON5 格式的键值对数据，可在规则中引用。

- **JSON5 编辑**：支持注释和尾随逗号
- **自动保存**：编辑后 300ms 自动保存到后端
- **快捷键**：`Cmd/Ctrl+N` 新建、`Cmd/Ctrl+D` 删除、`Cmd/Ctrl+Shift+R` 重命名、`Cmd/Ctrl+F` 搜索

### Settings — 应用设置

分类式设置面板，包含以下三个类别：

| 类别 | 配置项 |
|------|--------|
| **Proxy** | 代理端口、Socks 端口、监听地址、HTTP Header 上限、请求列表上限、代理鉴权（用户名/密码）、Bypass 白名单、系统代理开关 |
| **Network** | 请求过滤规则（支持通配符，按域名/路径/URL 匹配） |
| **App** | 存储目录切换、主题（跟随系统/亮色/暗色）、开机自启、隐藏 Dock 图标 |

## 安装

请根据你的操作系统选择对应的安装步骤。

<details>
  <summary>macOS</summary>

##### 1. 选择正确的安装包

根据你的 Mac 处理器类型选择对应版本：
- Apple Silicon 芯片 (M系列) → 下载 ARM 64位版本：[Prokcy-vx.y.z-mac-arm64.dmg](https://github.com/Yaphet2015/Prokcy/releases)
- Intel/AMD 芯片 → 下载 x86_64 版本：[Prokcy-vx.y.z-mac-x64.dmg](https://github.com/Yaphet2015/Prokcy/releases)

##### 2. 安装步骤

1. 下载完成后，双击下载的 `.dmg` 文件
2. 将 Prokcy 图标拖拽至 Applications 文件夹
3. 如遇以下情况：
   - 提示 "应用已存在" → 选择 "覆盖"
   - 无法覆盖 → 请先退出正在运行的 Prokcy

##### 3. 安全提示

某些企业安全软件可能误报，建议：
- 首次运行时选择 "允许" 操作
- 如有持续拦截，请联系IT部门将 Prokcy 加入白名单
</details>

<details>
  <summary>Windows</summary>

##### 1. 下载安装包

根据你的权限需求选择适合的版本：

- 【推荐】标准版（需管理员权限）：[Prokcy-vx.y.z-win-x64.exe](https://github.com/Yaphet2015/Prokcy/releases)
    > 支持完整功能，包括伪协议 (`whistle://client`)
- 用户版（无需管理员权限）：[Prokcy-user-installer-vx.y.z-win-x64.exe](https://github.com/Yaphet2015/Prokcy/releases)
    > 功能限制：不支持伪协议调用

##### 2. 运行安装程序

双击下载的安装包后，你可能会看到以下安全提示，请按顺序操作：

1. 用户账户控制提示 → 点击 "是" 继续安装
2. 安装向导界面 → 按照提示逐步完成
</details>

<details>
  <summary>Linux（Fedora/Ubuntu）</summary>
本客户端目前支持 Fedora 和 Ubuntu 两个 Linux 发行版。

下载安装包：
- Intel/AMD 64位（x86_64）：[Prokcy-vx.y.z-linux-x86_64.AppImage](https://github.com/Yaphet2015/Prokcy/releases)
- ARM 64位（arm64）：[Prokcy-vx.y.z-linux-arm64.AppImage](https://github.com/Yaphet2015/Prokcy/releases)

安装方法参考：https://zhuanlan.zhihu.com/p/517734580
</details>

## 快速上手

### 启动客户端

安装完成后，请通过以下方式启动：
1. 点击桌面上的 Prokcy 图标
2. 或通过系统应用程序菜单找到 Prokcy

### 系统证书和代理设置

1. 打开客户端顶部 `Prokcy` 菜单
2. 点击 `Install Root CA`：安装系统根证书，用于解析 HTTPS 请求
3. 开启 `Set As System Proxy`（或在 Settings → Proxy 中勾选）：设置系统代理，用于捕获系统的 Web 请求

### 顶部菜单

| 菜单项 | 说明 |
|--------|------|
| `Proxy Settings` | 打开 Settings → Proxy 设置面板 |
| `Install Root CA` | 安装 HTTPS 根证书 |
| `Check Update` | 检查新版本 |
| `Set As System Proxy` | 设置/取消系统代理 |
| `Start At Login` | 是否开机自动启动 |
| `Hide From Dock` | 是否隐藏 Dock 图标（macOS） |
| `Restart` | 重启客户端 |
| `Quit` | 退出客户端 |

## Rules 规则详解

### 规则分组与优先级

Prokcy 支持多个规则分组同时生效，优先级按列表**从上到下**排列。

#### 总开关
- `Disable All`：停用所有规则（包括 `Default` 和所有自定义分组）
- `Enable All`：重新启用规则匹配

#### 分组操作
- **单击**分组：切换到该分组进行编辑
- **双击**分组：切换启用/停用状态
- **拖拽**分组：调整优先级顺序
- 启用的分组显示优先级标记（`#1`、`#2`、...）

#### 优先级规则
1. 越靠上的分组优先级越高，靠下的作为兜底
2. 自定义分组优先于 `Default` 参与匹配
3. 同一分组内部也是从上到下匹配，先命中的生效

#### 示例

**分组间覆盖：**

```txt
Group A（#1，已启用）
example.com https://a.test

Group B（#2，已启用）
example.com https://b.test
```

请求 `http://example.com/1` 时，优先命中 Group A，最终走 `https://a.test`。

**Default 兜底：**

```txt
Group A（#1，已启用）
foo.com https://foo-group.test

Default（已启用）
foo.com https://foo-default.test
bar.com https://bar-default.test
```

- `foo.com` 命中 Group A（覆盖 Default）
- `bar.com` 在 Group A 未命中，回落到 Default

> 规则语法与 whistle 完全兼容，详细语法请参阅 [whistle 规则文档](https://wproxy.org/whistle/rules/)。

## 键盘快捷键

| 快捷键 | 功能 | 适用范围 |
|--------|------|----------|
| `Cmd/Ctrl + S` | 保存 | Rules / Settings |
| `Cmd/Ctrl + /` | 切换注释 | Rules |
| `Cmd/Ctrl + N` | 新建 | Values |
| `Cmd/Ctrl + D` | 删除 | Values |
| `Cmd/Ctrl + Shift + R` | 重命名 | Values |
| `Cmd/Ctrl + F` | 搜索 | Values |
| `Cmd/Ctrl + ,` | 打开 Settings | 全局 |
| `Cmd/Ctrl + B` | 折叠/展开侧边栏 | 全局 |

## License

[MIT（详见 LICENSE 文件）](./LICENSE)

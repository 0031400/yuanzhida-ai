# 小程序工程化实施方案（TypeScript + SCSS + Vant Weapp + dayjs）

## 1. 技术选型

1. 小程序框架：原生微信小程序（基于当前 `miniprogram` 目录）
2. 语言：TypeScript
3. 样式：SCSS（Sass）
4. UI 组件库：`@vant/weapp`
5. 时间处理：`dayjs`
6. 代码规范：ESLint + Prettier（可选补充 stylelint）
7. 状态管理：先用轻量全局状态（`App.globalData + storage`），后续可演进到 `mobx-miniprogram`

## 2. 项目目录架构（建议）

```text
miniprogram/
  app.ts
  app.json
  app.scss

  config/
    env.ts
    index.ts

  api/
    user.ts
    question.ts
    comment.ts
    message.ts
    upload.ts

  services/
    auth.service.ts
    question.service.ts
    message.service.ts

  store/
    auth.store.ts
    app.store.ts

  types/
    api.ts
    user.ts
    question.ts
    comment.ts
    message.ts

  utils/
    request.ts
    storage.ts
    day.ts
    validate.ts
    error-map.ts

  components/
    question-card/
    comment-item/
    empty-state/
    load-more/

  pages/
    index/
    question-detail/
    ask/
    login/
    me/
    message/
    my-questions/
    my-comments/
    my-collects/

  styles/
    variables.scss
    mixins.scss
    reset.scss
```

## 3. 分层职责

1. `api/`：只定义接口函数和参数映射，不放复杂业务逻辑
2. `services/`：业务流程编排（例如“先上传图片再发布问题”）
3. `store/`：全局状态（登录态、用户信息、未读消息数）
4. `utils/request.ts`：统一请求入口（token 注入、错误处理、401 兜底）
5. `pages/`：页面展示与交互，不直接承担复杂网络编排
6. `components/`：可复用业务组件，减少页面重复代码

## 4. 核心工程规范

1. 统一返回类型：`ApiResponse<T>`
2. 页面统一三态：`loading / empty / error`
3. 所有提交动作必须防重复提交
4. 所有时间格式化统一走 `utils/day.ts`（基于 `dayjs`）
5. 错误码统一映射到 `utils/error-map.ts`
6. SCSS 设计令牌统一放 `styles/variables.scss`
7. 请求参数与响应体必须显式 TS 类型，禁止 `any`

## 5. 关键流程设计

### 5.1 应用启动

1. `app.ts` 启动读取本地 token
2. 若存在 token，拉取用户信息
3. 将登录态写入 `auth.store`
4. 初始化消息未读数

### 5.2 网络请求流程

1. 所有请求走 `utils/request.ts`
2. 自动注入鉴权信息（按后端当前约定）
3. 统一处理业务错误码并提示
4. 命中未登录错误码时清理登录态并跳登录页

### 5.3 发布问题流程

1. 用户选图
2. 调用上传接口（`/cos/upload`）拿文件地址
3. 组装问题参数并调用发布接口
4. 成功后回到详情页或列表并刷新

### 5.4 列表分页流程

1. 统一分页模型：`current / size / hasMore / loading`
2. 页面触底加载下一页
3. 下拉刷新重置分页并重新拉首屏
4. 去重并保障并发请求互斥

## 6. 页面规划（MVP）

1. `index`：问题列表（分类、搜索、分页）
2. `question-detail`：题目详情、评论列表、评论发布
3. `ask`：发布问题（标题、内容、分类、图片）
4. `login`：登录/注册/验证码
5. `me`：我的提问、我的回答、我的收藏入口
6. `message`：通知列表（评论/点赞/收藏）

## 7. Vant Weapp 组件使用建议

1. 表单：`van-form`、`van-field`、`van-button`
2. 列表：`van-list`、`van-cell`、`van-empty`
3. 反馈：`van-toast`、`van-dialog`、`van-notice-bar`
4. 筛选：`van-tabs`、`van-dropdown-menu`
5. 上传：`van-uploader`（结合后端上传接口）

## 8. 迭代里程碑

### 里程碑 1：工程底座

1. 完成依赖接入（TS/SCSS/Vant/dayjs）
2. 建立 `request.ts`、`types/api.ts`、基础 store
3. 建立样式变量体系和公共工具

### 里程碑 2：主链路闭环

1. 打通 `index -> question-detail -> ask`
2. 完成登录态处理
3. 完成评论发布与列表刷新

### 里程碑 3：个人中心与消息

1. 完成 `me` 页面核心能力
2. 完成 `message` 页与未读数联动
3. 完成收藏、点赞状态同步

### 里程碑 4：体验与质量

1. 全局错误提示和空状态完善
2. 提交防抖、防重复、骨架屏补齐
3. ESLint/Prettier 规则固化并清理告警

## 9. 下一步实施顺序（建议）

1. 先落地 `utils/request.ts` 与 `types/api.ts`
2. 再实现 `api/question.ts` + `index` 列表分页
3. 接着实现 `question-detail` 与 `ask` 页
4. 最后接 `login`、`me`、`message`

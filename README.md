# reco-toolkit-ui

- [使用說明](#使用說明)
- [舊項目遷移](#舊項目遷移)
- [FAQ](#faq)

## 使用說明

### 安裝
安裝 reco-cli & reco-toolkit-ui
```bash
tnpm install -gd @tencent/reco
tnpm install -gd @tencent/reco-toolkit-ui
```

### 創建新項目
在想要建立項目的文件夾下執行
```bash
// 指定重構類型項目
reco init --type ui

// 如不指定類型，透過引導式問答建立項目
reco init
? Please select a boilerplate group ?
> web
? Please select a boilerplate type
> 0 - Pure webrebuild boilerplate
```
註: 在空文件夾執行 reco init，會直接當前目錄建立項目結構和文件；在非空文件夾中執行 reco init，會告知當前目錄已有文件，並詢問新項目文件夾名稱。

用 help 指令查看 init 有哪些其他可選項
```bash
reco help init
```

### 項目結構

```
.
├── README.md
├── client
│   ├── container
│   │   └── index.js
│   └── style
│       └── index.scss
├── config
│   └── reco-config.js
├── jsconfig.json
├── package-lock.json
├── package.json
└── template
    └── common.ejs
```
* container/index.js 是開發頁面的路口，透過 reco-config.js 配置
* template/index.dev.js 是HTML頁面的通用模版（之後會支持多模版）

### 配置文件
```js
const path = require('path');
const pkgJson = require('../package.json');

module.exports = {
  postcss: false, //true or false
  devDirectory: '_tmp',

  webpack: {
    context: path.join(process.cwd(), 'client/container'),
    entry: ["index"],
    output: {
      path: path.join(process.cwd(), 'dist'),
    },
    externals: {
      'react': 'React',
      'react-dom': 'ReactDOM'
    },
    resolve: {
      alias: {
        "components": "", //组件路径
        "currentDir": path.join(process.cwd(), 'client')
      }
    },
    module: {
      rules: [
      ]
    },
    plugins: [],
    recoCustom: {
      commonsChunk: {
        name: null, //公共js、样式文件名，默认common
        minChunks: null, //至少几个文件出现才抽取公共
        exclude: []
      },
      HtmlWebpackPlugin: {
        template: path.join(process.cwd(), "template/common.ejs"),
      }
    }
  },

  upload: {
    project: pkgJson.name,
    user: pkgJson.author,
    host: 'http://wapstatic.sparta.html5.qq.com/upload',
    timeout: 30000,
    dir: 'publish'
  },

  sprites: {
    spritesmith: {
      padding: 4
    }, //雪碧图间距
    retina: true, //retina屏幕
    ratio: 3 //图片分倍率
  },
}
```
* postcss - 設置 `true` 使用 QQ瀏覽器 postcss 默認配置 (autoprefixer, postcss-flexbugs-fixes, postcss-gradientfixer）
* devDirectory - 開發環境 `reco server` 暫時文件目錄，以及本地服務器根目錄位置。
* webpack - 配置與官方文件說明用法相同 https://doc.webpack-china.org/configuration/ <br>recoCustom 為 webpack 客制的配置
  1. commonsChunk 用來輸出公共樣式文件，配置說明可參考 https://doc.webpack-china.org/plugins/commons-chunk-plugin/
  2. HtmlWebpackPlugin 用 [html-webpack-plugin](https://github.com/jantimon/html-webpack-plugin) 的模版功能，動態生成 HTML 文件，目前只提供 template 配置，可傳入字串或數組，示例如下
```
// 所有 entry 使用一個模版
HtmlWebpackPlugin: {
  template: path.join(process.cwd(), "template/common.ejs"),
}

// 特定 entry 需要自己的模版
HtmlWebpackPlugin: {
  template: [
    path.join(process.cwd(), "template/common.ejs"), // 其餘未指定 webpack entry 使用公共模版
    { 'page-a' : path.join(process.cwd(), 'template/page-a.ejs') },
    { 'page-b' : path.join(process.cwd(), 'template/page-b.ejs') },
  ]
}
```
* upload - 指定 dir 根目錄，如果上傳 host 沒改，線上地址為 `http://wapstatic.sparta.html5.qq.com/{$user}/{$project}/`
* sprites - 暫時無法使用

### 支持指令
如果 reco-cli 有找到項目相對應的 toolkit 可以透過 `reco help` 列出目前支持的指令。

目前 reco-toolkit-ui 支持指令
`reco server` 本地開發，啟動服務器 & 監聽文件
`reco build` 生成 html, css 和 js 靜態文件
`reco upload` 打包 publish 文件夾，上傳 wapstatic 服務器

## 舊項目遷移
1. 卸載舊版 reco: `tnpm un -g recombl`
2. 安裝新版 reco: `tnpm i -gd @tencent/reco`
3. 安裝 reco 重構工具箱: `tnpm i -gd @tencent/reco-toolkit-ui`

### 注意點
1. pageConfig.js 和 userConfig.js 合并到 reco-config.js (可以用 reco init 新增項目參考)
2. package.json 配置
    * 必須配置 template 欄位
    * name, author, repository 是用來統計頁面的
  ![package.json 配置](docs/pkg-json-config.png?raw=true)

以上配置均可參考 qb-weather reco 分支 http://git.code.oa.com/rickiezheng/qb-weather/tree/reco

## FAQ
1. Windows node-sass 安裝失敗
![Windows node-sass build failure](docs/win-install-node-sass-error.png?raw=true)
```bash
npm install --global --production windows-build-tools
```
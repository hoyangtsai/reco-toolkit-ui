# reco-toolkit-ui

## 使用說明

### 安裝 reco-cli
先在全局安裝 reco-cli
```bash
tnpm install -g @tencent/reco
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
    └── index.dev.ejs
```
* container/index.js 是開發頁面的路口，透過 reco-config.js 配置
* template/index.dev.js 是HTML頁面的通用模版（之後會支持多模版）

### 配置文件
```js
const path = require('path');

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
    plugins: {
      commonsChunk: {
        name: null, //公共js、样式文件名，默认common
        minChunks: null, //至少几个文件出现才抽取公共
        exclude: []
      },
      HtmlWebpackPlugin: {
        template: path.join(process.cwd(), "template/index.dev.ejs"),
      }
    }
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
* webpack - 全部官方配置用法相同，除了 plugins 是暫時無法自行配置。 plugins 配置目前只用來指定公共模塊和透過 html-webpack-plugin 指定的 ejs 模版動態生成 html 文件。
* sprites - 暫時無法使用

### 支持指令
如果 reco-cli 有找到項目相對應的 toolkit 可以透過 `reco help` 列出目前支持的指令。<br>
目前 reco-toolkit-ui 支持指令<br>
`reco server` 本地開發，啟動服務器 & 監聽文件<br>
`reco build` 生成 html, css 和 js 靜態文件<br>
`reco upload` 打包 publish 文件夾，上傳 wapstatic 服務器<br>

## FAQ

1. Windows node-sass 安裝失敗
![Windows node-sass build failure](docs/win-install-node-sass-error.png?raw=true "Windows node-sass build failure")
```bash
npm install --global --production windows-build-tools
```
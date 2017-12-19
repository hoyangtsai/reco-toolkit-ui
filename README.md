## 使用操作

1. 先在全局安裝 reco-cli
```
tnpm install -g @tencent/reco
```

2. 在想要創建新項目的路徑下執行
```
// 指定重構類型項目
reco init --type ui

// 如不指定，透過引導式問答建立項目
reco init
? Please select a boilerplate group ?
> web
? Please select a boilerplate type
> 0 - Pure webrebuild boilerplate
```
註: 在空文件夾執行 reco init，會直接當前目錄建立項目結構和文件；在非空文件夾中執行 reco init，會告知當前目錄已有文件，並詢問新項目文件夾名稱。

3. 用 help 指令查看 init 有哪些其他可選項
```
reco help init
```


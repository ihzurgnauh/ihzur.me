---
title: "在ubuntu中搭建node环境"
date: 2024-06-12T16:41:33+08:00
lang: zh
---
[[toc]]

### 1.安装nvm

这里使用nvm[^1]来进行node的版本控制

[^1]: [nvm](https://github.com/nvm-sh/nvm)是一个管理node.js版本的工具

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash 
```

使配置生效，这里使用了zsh

```bash
source ~/.zshrc  
```

验证nvm安装情况

```
nvm -v
```

### 2.安装node.js

列出node可用版本

```bash
nvm ls-remote  
```

安装指定版本，这里安装18.20.3

```bash
nvm install 18.20.3 
```

### 3.更换npm源

更换npm为国内源

```bash
npm config set registry https://registry.npmmirror.com 
```

### 4.使用npm安装pnpm

```bash
npm install -g pnpm 
```

---
title: "使用hugo搭建静态博客"
date: 2023-01-28T11:13:35+08:00
lang: zh
tocAlwaysOn: true
---
[[toc]]

## 什么是Hugo？

[Hugo](https://gohugo.io/)是一个快速且灵活的静态网站生成器，用于创建博客、文档和其他类型的网站。它使用Go语言编写，具有高性能和简便的使用体验，允许用户通过 Markdown 文件来管理内容，并支持主题定制和多种输出格式。

## 安装Hugo

安装方式有很多种，参考[官方文档](https://gohugo.io/installation/)安装即可，Windows可下载对应的操作系统版本的Hugo二进制文件，并将二进制文件的放置路径配置在环境变量中，即可使用Hugo CLI来快速创建静态网站。

```bash
# 查看版本，验证安装情况
hugo version 
```

## 生成站点

安装完成后，使用下面命令生成站点。

```bash
# 使用Hugo新建blogDemo项目，名称可自定义
hugo new site blogDemo 
```

用 Hugo 创建的网站共有 7 个文件夹和 1 个文件，这些文件分别代表：

- **archetypes**：存放用`hugo`命令新建的 Markdown 文件应用的 front matter 模版

- **content**：存放内容页面，比如博客、笔记等

- **layouts**：存放定义网站的样式，写在`layouts`文件下的样式会覆盖安装的主题中的 `layouts`文件同名的样式

- **static**：存放所有静态文件，如图片

- **data**：存放创建站点时 Hugo 使用的其他数据

- **public**：存放 Hugo 生成的静态网页

- **themes**：存放主题文件

- **config.toml**：网站配置文件

>[!IMPORTANT]
>创建完项目后,在使用`hugo`命令时，当前目录下必须要有配置文件，即`config.toml`

新建完成后进入**blogDemo**目录可以看到网站的文件目录。

```bash
# 进入blogDemo目录
cd blogDemo 
```

## 安装主题

Hugo的官网[主题](https://themes.gohugo.io/)种类很多，基本能满足各类需求，安装只需把对应的主题文件放置在themes目录，主题的相关配置可参考其文档。这里就以[even主题](https://github.com/olOwOlo/hugo-theme-even)为例，并非所有主题都是直接clone下来就能使用，具体的看主题安装的说明。

```bash
# 进入主题目录
cd themes

# clone 主题
git clone https://github.com/olOwOlo/hugo-theme-even.git
```

## 本地调试和预览

安装完主题后，在网站的配置文件目录，输入下面命令，就可以在本地预览了，服务器的默认地址是<TextCopy inline>http://localhost:1313/</TextCopy>, 端口号可以通过 **-p** 参数自定义端口来修改。

```bash
# 启动本地调试服务
hugo server 
```

至此就可以在**content**下的**post**目录中添加文章，使用 Markdown 进行创作记录了。

```bash
# 新建文章，post/demo.md 为新建的路径，可根据实际的更改。
hugo new post/demo.md
```

## 构建站点

最后再通过下面命令，便会在**public**目录生成构建的产物，最后把生成的文件部署至服务器，或者 GitHub Pages、Netlify 等其它静态网站托管平台即可。可参考Hugo社区提供的[部署文档](https://gohugo.io/hosting-and-deployment/)。

```bash
# 生成静态网站
hugo build

# 生成静态网站并进行压缩，可减少产物大小，建议使用该命令
hugo --minify 
```

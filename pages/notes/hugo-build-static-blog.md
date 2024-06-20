---
title: "使用hugo搭建静态博客"
date: 2023-01-28T11:13:35+08:00
lang: zh
---
[[toc]]

## Hugo介绍

Hugo是由Go语言实现的静态网站生成器。简单、易用、高效、易扩展、快速部署。Hugo这样的选择允许您简化堆栈，编写markdown文档，处理更新和自定义内容，从而生成网站。

## 安装Hugo

安装方式有很多种，参考[官方文档](https://www.gohugo.org/doc/overview/installing/)安装即可，Windows可下载对应的操作系统版本的Hugo二进制文件，然后将二进制文件的放置路径配置在环境变量中。

```bash
hugo version # 查看版本，验证安装情况
```

## 生成站点

安装完成后，使用下面命令生成站点。

```bash
hugo new site blogDemo # 使用Hugo新建blogDemo项目，名称可自定义
```

**注意，创建完项目后再使用`hugo`命令时，当前目录下必须要有配置文件，即`config.toml`，否则会报错**



然后进入 blogDemo目录可以看到网站的文件目录。

```bash
cd blogDemo # 进入blogDemo目录
```

## 安装主题

Hugo的官网[主题](https://themes.gohugo.io/)种类很多，基本能满足各类需求，安装只需把对应的主题clone到themes目录，具体的主题配置参考其文档即可，这里就以[even主题](https://github.com/olOwOlo/hugo-theme-even)为例。

```bash
git clone https://github.com/olOwOlo/hugo-theme-even.git
```

## 本地调试

安装完主题后，在网站的配置文件目录，输入下面命令，就可以在本地预览了，服务器的默认地址是http://localhost:1313/, 端口号可以通过 -p 参数自定义端口来修改。

```bash
hugo server # 启动本地调试服务
```

至此就可以在content下的post目录中添加文章，进行创作记录了。

```bash
hugo new post/demo.md
# hugo new的命令格式
# hugo new [path]
```


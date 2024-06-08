![bitiful-tldraw-screenshop-colorful](https://github.com/bitiful/tldraw-for-s4/assets/168170389/a3b9246a-a110-402f-a588-b3e13f2bb85b)

## 介绍

本项目基于 [tldraw-sockets-example](https://github.com/tldraw/tldraw-sockets-example) 二次开发而来。

有如下开箱即用特性：

1. 首次访问自动分配房间，并有独立的 Url 代表房间唯一入口；
2. 房间中内置了基于 WebSocket 的多人协作能力（本例中每个房间限2人加入）；
3. 使用预签名方式将媒体文件上传至所有兼容 S3 协议的对象存储（本例中为 [缤纷云S4](https://www，bitiful.com/)）
4. 利用 [缤纷云S4](https://www，bitiful.com/) 独有的 **Simul-Transfer 同步传输** 技术，实现了 **即传即下** 的大文件分享特性：分享者上传一开始（而不用等待上传结束），接受者即可开始下载或播放分享的资料。

## 缤纷云独有的 Simul-Transfer 同步传输技术

缤纷云为大文件分享场景专门研发了 `Simul-Transfer（同步传输）` 技术，使用户在分享资料场景下第一次能真正完全自由地享受 `即传即下` 的便利。

**「同步传输」演示：**

https://github.com/bitiful/tldraw-for-s4/assets/168170389/0fa4857c-fce8-4676-9799-b8142abf918e

它有几个特点：

1. 使用超级方便：只要在对象的下载网址末尾加上 `?no-wait` 参数，即可使用；
2. 无客户端限制：兼容任何系统中的任何下载工具，如：
    - chrome、edge、Safari 等浏览器
    - curl、wget 等命令行下载工具
    - 迅雷、IDM 等高级下载工具
3. 与实时传输不同，Simul-Transfer 技术超级省心，同时具备高性能和高兼容度：
    - `接受者` 无需等待 `分享者` 将整个文件上传完毕，即可开始下载
    - `分享者` 也无需等待 `接受者` 就绪，无论是否有人接收，都不影响当前的全速上传
    - 全速下载，没有带宽争抢，假如：分享者正以 10MB/s 速度将一个 10GB 大小的视频上传至缤纷云S4：
        - 从第 1 秒开始，所有人都可以立即从以 10MB/s 的速度下载或播放该视频（实时播放需确保视频的 moov 元数据在开头，例如：在 ffmpeg 中加上 `-movflags faststart` 参数）
        - 从第 30 秒后开始下载的接受者在下载前 300MB 内容时将以最大速度进行，直至触达上传进度，会以分享上传的10MB/s速度继续下载。
    - 已上传的部分支持完整的 Range 请求

该功能可以用于优化实时协作类应用的用户体验，如白板、文件分享等场景。

## How to run

1. Clone 项目
2. 运行
```shell
   npm install
```
3. 运行
```shell
npm run dev
```
运行预签名接口服务：
见：https://github.com/bitiful/s3-presigned-api-server

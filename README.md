This repository shows how you might use [tldraw](https://github.com/tldraw/tldraw) together with bare websockets. It
also makes a good example for how to use tldraw with other backend services!
---

## 简介

本项目基于 [tldraw-sockets-example](https://github.com/tldraw/tldraw-sockets-example)
的基础上进行开发，主要把文件上传部分修改为上传到[缤纷云S3](https://www.bitiful.com)。

缤纷云S3开发了 `no-wait-transfer` 功能，该功能实现了文件在上传到缤纷云S3时，不需要等待文件上传完成，就可以开始下载，即：边上传边下载。

该功能可以用于优化实时协作类应用的用户体验，如白板、文件分享等场景。

## How to run

1. Clone 项目
2. 运行 `npm install`
3. 运行 `npm run dev`
4. Mac用户
   执行 `BUCKET=<your_bucket> AK=<your-bitiful-s3-accesskey> SK=<your-bitiful-s3-secretkey> ./api-server-mac`
5. Windows用户
   执行 `BUCKET=<your_bucket> AK=<your-bitiful-s3-accesskey> SK=<your-bitiful-s3-secretkey> ./api-server-win.exe`

api server 项目地址 https://github.com/bitiful/tldraw-no-wait-transfer-api-server
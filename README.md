# 简单的寻路算法可视化示例
> 原项目引用自 [find-path](https://gitee.com/jiankesword/find-path) <br> [B站视频链接](https://www.bilibili.com/video/BV1SJ411u7NB?t=85)
<br/>
<br/>

### 运行示例 
![image](https://gitee.com/jiankesword/image-layer/raw/master/searchPath/search.gif)

### 项目结构
![image](https://gitee.com/jiankesword/image-layer/raw/master/searchPath/structure.png)

### 寻路算法
网上很多文章，这里就不重复介绍了  
如果看了网上的文章仍然觉得A*寻路难以理解可以运行本项目观察寻路过程  
建议使用单步寻路功能，观察程序是如何一步一步从起点找到终点的  

### 使用方法
 > 使用 cocos creator 2.4.5 打开本项目  
 > 在 chrome 浏览器中运行   
 > 调试： 编辑语言 javaScript 

## 更新日志

## [1.0.1] - <2021-07-20>

### 新增

* 升级 Cocos Creator 版本至 2.4.5
* 新增八方向寻路
* 新增不同地形格子类型分别代表不同路径代价

### 重构

* 优化部分代码逻辑增强复用性

### 修复

* 修复在遍历临近方块时判断逻辑错误
import { startGrid, endGrid, normalGrid } from './constant'
import { GRID_TYPE } from './grid';

/** 斜边代价 */
const HYPOTENUSE_PRICE = 1.41;

class Search {
    constructor(Grid, isEightDirection = false) {
        this.openList = [] // 记录待检查的列表 元素类型是block
        this.closeList = [] // 不再检查的列表
        this.results = []    // 结果路径格子数组
        this.pathPoint = [] // 可以绘制的路径点
        this.grid = Grid    // 传入的地图对象
        this.searchComplete = false // 检索完成
        this.isEightDirection = isEightDirection; // 是否开启八方向寻路
        this.searchInit()
    }

    // 将起点加入open列表，修改过起点后应该执行
    searchInit() {
        let startBlock = this.grid.gridToBlock(this.grid.startBlock)
        this.openList = [startBlock]
    }

    // 检查这个块的类型
    checkType(block) {
        return this.grid.checkGridType(this.grid.blockToGrid(block))
    }

    // 寻路的核心步骤
    stepSearch() {
        let currentBlock = this.openList.pop()
        if (!currentBlock) {
            cc.log('寻路结束， 无法找到最短路径');
            return false;
        }
        let type = this.checkType(currentBlock)
        if (type != GRID_TYPE.START_GRID && type != GRID_TYPE.END_GRID) {
            this.grid.changeToClose(currentBlock)
        }
        this.closeList.push(currentBlock)
        let neighborArray = this.getNeighborBlock(currentBlock)
        let newOpenNeighbor = this.neighborProcess(neighborArray, currentBlock)

        // 合并数组
        this.openList = [...this.openList, ...newOpenNeighbor]

        // pop操作选择F值最小的  所以根据F值从大到小排序 再根据G进行二级排序
        // 排序方法不同，面对不同地形的搜索效率也不同，感兴趣可以修改一下排序方法
        this.openList.sort((a, b) => {
            if (b.F == a.F) {
                return a.H - b.H // 仍然有可能不是最短路径，较优路径但是搜索的次数大幅增长
                // return a.G - b.G  // 不是最短路径，搜索比较快
            }
            return b.F - a.F
        })
        // cc.log('openList', this.openList);
        // cc.log('closeList', this.closeList);
        // 查看是否已经搜索到终点
        let end = this.grid.endBlock
        neighborArray.map(i => {
            let g = this.grid.blockToGrid(i)
            if (g.x == end.x && g.y == end.y) {
                cc.log('找到终点了')
                this.searchComplete = true
                let endBlock = this.grid.gridToBlock(end)
                endBlock.parent = currentBlock
                this.parseResult(endBlock)
            }
        })
        return true;
    }

    // 递归 解析路径
    parseResult(block) {
        const set = new Set();
        while (block.parent) {
            if (set.has(block)) {
                cc.log(block)
                return;
            }
            set.add(block);
            this.results.push(block);
            block = block.parent;
            // block.parent = null;
        }
        
        let startBlock = this.grid.gridToBlock(this.grid.startBlock);
        this.results.push(startBlock);
        // cc.log(this.results);
        this.parsePath();
    }

    // 根据路径的节点解析出可绘制的路径
    parsePath() {
        // 每个格子中心的坐标
        let r = this.results
        for (let i = 0; i < r.length; i++) {
            let x = r[i].x + 0.5 * this.grid.blockSide
            let y = r[i].y + 0.5 * this.grid.blockSide
            let point = cc.v2(x, y)
            this.pathPoint.push(point)
        }
        // cc.log(this.pathPoint)
    }

    // 根据当前的块，返回邻近四方向的块
    getNeighborBlock(block) {
        let neighbor = []
        let grid = this.grid.blockToGrid(block)
        if (grid.x > 0) {
            neighbor.push(cc.v2(grid.x - 1, grid.y))

            if (this.isEightDirection && grid.y > 0) { // left bottom
                neighbor.push(cc.v2(grid.x - 1, grid.y - 1))
            }

            if (this.isEightDirection && grid.y < this.grid.col - 1) { // left top
                neighbor.push(cc.v2(grid.x - 1, grid.y + 1))
            }
        }
        if (grid.x < this.grid.row - 1) {
            neighbor.push(cc.v2(grid.x + 1, grid.y))

            if (this.isEightDirection && grid.y > 0) { // right bottom
                neighbor.push(cc.v2(grid.x + 1, grid.y - 1))
            }

            if (this.isEightDirection && grid.y < this.grid.col - 1) { // right top
                neighbor.push(cc.v2(grid.x + 1, grid.y + 1))
            }
        }
        if (grid.y > 0) {
            neighbor.push(cc.v2(grid.x, grid.y - 1))
        }
        if (grid.y < this.grid.col - 1) {
            neighbor.push(cc.v2(grid.x, grid.y + 1))
        }

        let blocks = []
        for (let i = 0; i < neighbor.length; i++) {
            blocks.push(this.grid.gridToBlock(neighbor[i]))
        }
        // cc.log('grid',grid,neighbor)
        // cc.log(blocks)
        // 去掉墙体和已经在关闭列表的
        blocks = blocks.filter(i => !i.isClose).filter(i => !i.isWall)//.filter(i => !i.isOpen) // open仍需要后续检查
        // 去除起点和终点
        blocks = blocks.filter(i => this.checkType(i) != GRID_TYPE.START_GRID)//.filter(i => this.checkType(i) != endGrid)
        // cc.log(blocks);
        return blocks
    }

    // 对邻近节点的处理
    neighborProcess(neighborArray, currentBlock) {
        // cc.log(neighborArray.map(v => v.gridType));
        let newOpenBlock = []
        for (let i = 0; i < neighborArray.length; i++) {
            let block = neighborArray[i]

            if (!block.isOpen) {
                block.parent = currentBlock
                this.computeFGH(block)
                if (this.checkType(block) != GRID_TYPE.START_GRID
                    && !block.isClose
                    && !block.isWall
                    && this.checkType(block) != GRID_TYPE.END_GRID) {

                    this.grid.changeToOpen(block)
                }
                newOpenBlock.push(block)

            } else if (currentBlock.G + 1 < block.G) {
                cc.log('@@@@@@@');
                // 使用当前路径到达相邻block时 F值若小于之前block的F值 则需要更新block的parent
                // 由于 H值为固定 则优化判断 由当前block的G值+由当前block到达该相邻block的代价小于该相邻block的G值时
                // 然后更新 F值与parent
                // cc.log(block, currentBlock)
                block.parent = currentBlock
                this.computeFGH(block)
            }
        }
        return newOpenBlock
    }

    // 计算块的fgh值
    computeFGH(block) {
        let grid = this.grid.blockToGrid(block)
        // let start = this.grid.startBlock
        let end = this.grid.endBlock
        // block.G = Math.abs(start.x - grid.x) + Math.abs(start.y - grid.y)
        block.G = block.parent ? (block.parent.G + this.calculateNeighborPrice(block.parent, block)) : 0 // G值应该是父节点的G值+1， 上面算出来仍然是估计值，所以错了

        // 常用的预估H值的方法有  曼哈顿距离 欧氏距离 对角线估价
        // 此处使用最简单的 曼哈段距离 进行预估
        // H = 当前方块到结束点的水平距离 + 当前方块到结束点的垂直巨鹿
        block.H = Math.abs(end.x - grid.x) + Math.abs(end.y - grid.y)
        block.F = block.G + block.H
        block.grid = this.grid.blockToGrid(block)
    }

    /**
     * 计算相邻方块之间的路径代价
     * @param {*} srcBlock 出发方块
     * @param {*} dstBlock 目的方块
     */
    calculateNeighborPrice(srcBlock, dstBlock) {
        const srcGrid = this.grid.blockToGrid(srcBlock);
        const dstGrid = this.grid.blockToGrid(dstBlock);

        const deltaX = Math.abs(srcGrid.x - dstGrid.x);
        const deltaY = Math.abs(srcGrid.y - dstGrid.y);
        if (deltaX !== 1 && deltaY !== 1) {
            cc.log('计算路径代价传入节点错误');
            return 1;
        }
        // 相邻走直线 斜边按 1.41 算
        if (deltaX === 1 && deltaY === 1) {
            return HYPOTENUSE_PRICE * this.getAveragePrice(srcBlock, dstBlock);
        } else if (srcGrid.x === dstGrid.x || srcGrid.y === dstGrid.y) {
            return this.getAveragePrice(srcBlock, dstBlock);
        }
    }

    /**
     * 两个格子各占一半路程
     * @param {*} srcBlock 
     * @param {*} dstBlock 
     * @returns 
     */
    getAveragePrice(srcBlock, dstBlock) {
        const ret = 0.5 * srcBlock.getPrice() + 0.5 * dstBlock.getPrice();
        return ret;
    }
}

export default Search
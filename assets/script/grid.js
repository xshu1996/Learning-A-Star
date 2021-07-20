import { startGrid, endGrid, normalGrid } from './constant'

export const GRID_TYPE = cc.Enum({
    START_GRID: 0, // 开始格子
    END_GRID: 1, // 结束格子
    NORMAL_GRID: 2, // 普通格子
    WALL_GRID: 3, // 障碍物格子
    WATER_GRID: 4, // 水路格子
    MIRE_GRID: 5, // 泥路格子
});

/** 正常走路代价 */
const NORMAL_PRICE = 1;
/** 水路代价 */
const WATER_PRICE = 3 * NORMAL_PRICE;
/** 泥路代价 */
const MIRE_PRICE = 2 * NORMAL_PRICE;

// 坐标，边长，颜色
class Block {
    constructor(x, y, side, color) {
        this.x = x
        this.y = y
        this.side = side
        this.color = color

        this._gridType = GRID_TYPE.NORMAL_GRID;

        // this.isWall = false // 是否为障碍物
        this.parent = null // 
        this.F = 0 // 方块的总移动代价
        this.G = 0 // 开始点到当前方块的移动代价
        this.H = 0 // 当前方块到结束点的预估移动代价
        this.isOpen = false // 是否在开放列表 -- 用于记录所有可考虑选择的格子
        this.isClose = false // 是否在封闭列表 -- 用于记录所有不再考虑的格子
    }

    get isWall () {
        return this.gridType === GRID_TYPE.WALL_GRID;
    }

    get gridType () {
        return this._gridType;
    }

    set gridType (value) {
        this._gridType = value;
    }

    getPrice() {
        const PRICE_LIST = [NORMAL_PRICE, 0, 0, 0, WATER_PRICE, MIRE_PRICE];
        return PRICE_LIST[this._gridType];
    }
}

// 构造器参数 坐标， 每个格子的边长， 每行每列分别几个格子
export class Grid {
    constructor(x, y, blockSide, row, col) {
        this.x = x
        this.y = y
        this.blockSide = blockSide
        this.row = row
        this.col = col
        this.blockArray = []
        this.startBlock = cc.v2(1, 1) // 起点的栅格坐标
        this.endBlock = cc.v2(3, 3) // 终点的栅格坐标

        if (row < 5 || col < 5) {
            throw Error('row and col number need more then 5')
        }
        
        this.init()

        const startBlock = this.gridToBlock(this.startBlock),
            endBlock = this.gridToBlock(this.endBlock);
        // cc.log(startBlock, endBlock)
        startBlock.gridType = GRID_TYPE.START_GRID;
        endBlock.gridType = GRID_TYPE.END_GRID;
    }

    init() {
        this.blockInit()
        this.starEndPointInit()
    }

    // 初始化栅格
    blockInit() {
        for (let i = 0; i < this.row; i++) {
            for (let j = 0; j < this.col; j++) {
                let [r, g, b, a] = [190, 190, 190, 255]
                let color = new cc.Color(r, g, b, a)
                let grid = cc.v2(i, j)
                let position = this.gridToPosition(grid)
                let block = new Block(position.x, position.y, this.blockSide, color)
                this.blockArray.push(block)
            }
        }
    }

    // 初始化起点和终点
    starEndPointInit() {
        let startIndex = this.gridToIndex(this.startBlock)
        let endIndex = this.gridToIndex(this.endBlock)

        this.blockArray[startIndex].color = new cc.Color(255, 0, 0, 255)
        this.blockArray[endIndex].color = new cc.Color(0, 0, 255, 255)
        // console.log(this.blockArray[startIndex],this.blockArray[endIndex], this.blockArray[endIndex+1], startIndex, endIndex)
    }

    // 栅格坐标转数组索引
    gridToIndex(grid) {
        let index = grid.x * this.col + grid.y
        return index
    }

    // 索引转栅格坐标
    indexToGrid(index) {
        let x = Math.floor(index / this.col)
        let y = index % this.row
        return cc.v2(x, y)
    }

    // 栅格坐标转普通坐标
    gridToPosition(grid) {
        let offset = this.blockSide // 因为graphics.rect 以左下角为原点绘制
        let topLeftCorner = cc.v2(this.x, this.y + this.blockSide * this.col) // 左上角的格子
        let x = topLeftCorner.x + grid.x * this.blockSide
        let y = topLeftCorner.y - grid.y * this.blockSide - offset
        return cc.v2(x, y)
    }

    // 普通坐标转栅格坐标
    positionToGrid(position) {
        // 最左边和最上边的边界
        let left = this.x
        let top = this.y + this.blockSide * this.col
        // 判断这个值是否在两个值之间
        let between = (value, min, max) => value > min ? (value < max ? true : false) : false

        let x = 0, y = 0
        for (let i = 0; i < this.row; i++) {
            let px = position.x
            let min = left + this.blockSide * i
            let max = left + this.blockSide * (i + 1)
            if (between(px, min, max)) {
                x = i
                break
            }
        }

        for (let i = 0; i < this.col; i++) {
            let py = position.y
            let min = top - this.blockSide * (i + 1)
            let max = top - this.blockSide * i
            if (between(py, min, max)) {
                y = i
                break
            }
        }
        return cc.v2(x, y)
    }

    getBlockData() {
        return this.blockArray
    }

    pointInGrid(point) {
        let left = this.x
        let right = this.x + this.blockSide * this.row
        let top = this.y + this.blockSide * this.col
        let bottom = this.y
        // console.log(`left:${left}, right:${right}, top:${top}, bottom:${bottom}`)
        // 判断是否在区域内
        if (point.x > left && point.x < right) {
            if (point.y > bottom && point.y < top) {
                return true
            }
        }
        return false
    }

    // 墙体和普通块互换
    wallNormalExchange(grid) {
        let block = this.gridToBlock(grid)
        block.isWall ? block.color = new cc.Color(190, 190, 190, 255) : block.color = new cc.Color(50, 50, 50, 255)
        // block.isWall = !block.isWall
        block.gridType = block.isWal ? GRID_TYPE.NORMAL_GRID : GRID_TYPE.WALL_GRID;
    }

    changeToTargetType(grid, type) {
        let block = this.gridToBlock(grid);
        block.gridType = type;
        const color_list = [new cc.Color(190, 190, 190, 255), new cc.Color(50, 50, 50, 255), new cc.Color(2, 249, 234, 255), new cc.Color(166, 92, 4, 255)];
        block.color = color_list[type - 2];
    }

    // 检查该栅格坐标块类型，起点终点或者普通格子
    checkGridType(grid) {
        let clickGrid = 0;
        let start = this.startBlock
        let end = this.endBlock

        if (grid.x == start.x && grid.y == start.y) {
            clickGrid = GRID_TYPE.START_GRID;
        } else if (grid.x == end.x && grid.y == end.y) {
            clickGrid = GRID_TYPE.END_GRID;
        } else {
            clickGrid = this.gridToBlock(grid).gridType;
        }
        return clickGrid
    }

    // 修改起点格子
    changeStartBlock(grid) {
        let block = this.gridToBlock(grid)
        let end = this.endBlock
        let originStart = this.blockArray[this.gridToIndex(this.startBlock)]
        if (!block.isWall && (end.x != block.x && end.y != block.y)) {
            const oldBlock = this.gridToBlock(this.startBlock);
            oldBlock.gridType = GRID_TYPE.NORMAL_GRID;
            oldBlock.color = new cc.Color(190, 190, 190, 255);
            this.startBlock = grid
            block.gridType = GRID_TYPE.START_GRID;
            originStart.color = new cc.Color(190, 190, 190, 255)
        }
        this.starEndPointInit()
    }

    // 修改终点格子
    changeEndBlock(grid) {
        let block = this.gridToBlock(grid)
        let start = this.startBlock
        let originEnd = this.blockArray[this.gridToIndex(this.endBlock)]
        if (!block.isWall && (start.x != block.x && start.y != block.y)) {
            const oldBlock = this.gridToBlock(this.endBlock);
            oldBlock.gridType = GRID_TYPE.NORMAL_GRID;
            oldBlock.color = new cc.Color(190, 190, 190, 255);
            this.endBlock = grid
            block.gridType = GRID_TYPE.END_GRID;
            originEnd.color = new cc.Color(190, 190, 190, 255)
        }
        this.starEndPointInit()
    }

    // 变成待检索格子
    changeToOpen(block) {
        // let block = this.gridToBlock(grid)
        block.color = new cc.Color(0, 255, 0, 255)
        block.isOpen = true
    }

    // 变成不再检索的格子
    changeToClose(block) {
        // let block = this.gridToBlock(grid)
        block.color = new cc.Color(29, 188, 165, 255)
        block.isOpen = false
        block.isClose = true
    }

    // 根据块获取栅格坐标
    blockToGrid(block) {
        let pos = cc.v2(block.x + 1, block.y + 1)
        return this.positionToGrid(pos)
    }

    // 根据栅格坐标获取块
    gridToBlock(grid) {
        let index = this.gridToIndex(grid)
        return this.blockArray[index]
    }

}
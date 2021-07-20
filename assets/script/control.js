import { Grid, GRID_TYPE }from './grid'
import Search from './search'
import { startGrid, endGrid, normalGrid } from './constant'

cc.Class({
    extends: cc.Component,

    properties: {
        p_btnEightSwitch: cc.Toggle,
        p_btnShowDebugSwitch: cc.Toggle,
        p_toggleContainer: cc.ToggleContainer,
    },

    onLoad() {
        let scene = cc.director.getScene()
        this.graphics = this.node.addComponent(cc.Graphics)
        this.grid = new Grid(-410, -180, 20, 30, 20)
        this.canvas = scene.getChildByName('Canvas')
        this.isMouseDown = false
        this.stop = false // mousedown的的时候会触发一次mousemove
        this.clickBlockState = GRID_TYPE.NORMAL_GRID; // 点击到的块状态
        this.lastGridPosition = cc.v2(0, 0)
        this.search = new Search(this.grid, this.p_btnEightSwitch?.checkMark?.node?.active);
        this.player = this.canvas.getChildByName('player')
        this.player.active = false
        this._selectType = GRID_TYPE.NORMAL_GRID;
    },

    start() {
        this.drawGrid()
        this.listenInit()
    },

    listenInit() {
        const pointWindowToCanvas = (point) => cc.v2(point.x - this.canvas.width / 2, point.y - this.canvas.height / 2)
        this.canvas.on(cc.Node.EventType.MOUSE_DOWN, (e) => {
            // console.log(e)
            this.isMouseDown = true

            this.stop = true
            this.scheduleOnce(() => this.stop = false, 0)

            let point = pointWindowToCanvas(cc.v2(e._x, e._y))
            this.mouseDownAction(point)
        })

        this.canvas.on(cc.Node.EventType.MOUSE_MOVE, (e) => {
            if (!this.isMouseDown) {
                return
            }
            if (this.stop) {
                return
            }
            let point = pointWindowToCanvas(cc.v2(e._x, e._y))
            this.mouseDownAction(point)
        })

        this.canvas.on(cc.Node.EventType.MOUSE_UP, (e) => {
            this.isMouseDown = false

            let point = pointWindowToCanvas(cc.v2(e._x, e._y))
            this.mouseUpAction(point)
        })

        this.p_btnEightSwitch.node.on('toggle', () => {
            if (!this.search) return;
            this.search.isEightDirection = this.p_btnEightSwitch.checkMark.node.active;
        }, this);

        this.p_toggleContainer.toggleItems.forEach((ele, index) => {
            ele.node.on('toggle', () => {
                this._selectType = index + 2;
            }, this);
        })
    },

    // 取消监听
    listenOff() {
        this.canvas.off(cc.Node.EventType.MOUSE_DOWN)
        this.canvas.off(cc.Node.EventType.MOUSE_MOVE)
        this.canvas.off(cc.Node.EventType.MOUSE_UP)
    },

    mouseDownAction(point) {
        let grid = this.grid
        let isClickGrid = grid.pointInGrid(point)
        // if (isClickGrid) {
        //     let gridPosition = grid.positionToGrid(point)
        //     cc.log(grid.gridToBlock(gridPosition));
        // }

        if (this.clickBlockState == GRID_TYPE.START_GRID || this.clickBlockState == GRID_TYPE.END_GRID) {
            return
        }

        if (isClickGrid) {
            let gridPosition = grid.positionToGrid(point)
            if (this.lastGridPosition.x == gridPosition.x && this.lastGridPosition.y == gridPosition.y) {
                return
            }
            this.lastGridPosition = gridPosition

            let type = grid.checkGridType(gridPosition)
            if (type == GRID_TYPE.START_GRID) {
                this.clickBlockState = GRID_TYPE.START_GRID;
            } else if (type == GRID_TYPE.END_GRID) {
                this.clickBlockState = GRID_TYPE.END_GRID;
            } else {
                // if (type == GRID_TYPE.NORMAL_GRID) {
                //     grid.wallNormalExchange(gridPosition)
                // }
                grid.changeToTargetType(gridPosition, this._selectType);
            }

            // console.log(grid.checkGridType(gridPosition))
            this.drawGrid()
        }
    },

    mouseUpAction(point) {
        let grid = this.grid
        let search = this.search
        let isClickGrid = grid.pointInGrid(point)
        if (isClickGrid) {
            let gridPosition = grid.positionToGrid(point)

            let type = grid.checkGridType(gridPosition)
            if (type == GRID_TYPE.NORMAL_GRID && this.clickBlockState == GRID_TYPE.START_GRID) {
                grid.changeStartBlock(gridPosition)
                search.searchInit()
            } else if (type == GRID_TYPE.NORMAL_GRID && this.clickBlockState == GRID_TYPE.END_GRID) {
                grid.changeEndBlock(gridPosition)
                search.searchInit()
            }

            this.clickBlockState = GRID_TYPE.NORMAL_GRID
            this.drawGrid()
        }
    },

    // 单步寻路
    stepSearchPath() {
        if (this.search.searchComplete) {
            this.listenOff()
            return
        }
        this.search.stepSearch()
        this.drawGrid()
        if (this.p_btnShowDebugSwitch?.checkMark?.node?.active) this.showFGH();
    },

    // 自动寻路
    autoSearchPath() {
        this.timerCall = () => {
            if (this.search.searchComplete) {
                console.log('search complete')
                this.unschedule(this.timerCall)
                this.listenOff()
                return
            }
            let ret = this.search.stepSearch()
            this.drawGrid()
            if (!ret) {
                this.unschedule(this.timerCall)
                this.listenOff()
                return
            }
        }
        
        this.schedule(this.timerCall, 0.05)
    },

    // 沿着路径行走
    moveByPath() {
        let path = this.search.pathPoint
        let start = path[path.length - 1]
        let player = this.player
        player.x = start.x
        player.y = start.y
        player.active = true
        player.stopAllActions() // 防止上一步还没完成就快速重置引起的bug
        for (let i = 0; i < path.length; i++) {
            let len = path.length
            let target = path[len-1-i] // 下一个目标点， 因为path是倒序的，从终点到起点，所以要倒序遍历
            let step = 0.3 // 每一步所需要的时间（秒
            let time = step * i // 这一步在几秒后执行
            this.scheduleOnce(() => {
                let action = cc.moveTo(step, target.x, target.y)
                player.runAction(action)
            }, time)
        }
    },

    // 重置寻路
    reset() {
        this.onLoad()
        this.start()
    },

    // 绘制栅格
    drawGrid() {
        let g = this.graphics
        let blockData = this.grid.getBlockData()
        // cc.log(blockData.filter(v => v.gridType === GRID_TYPE.START_GRID || v.gridType === GRID_TYPE.END_GRID));
        for (let b of blockData) {
            g.fillColor = b.color
            // console.log(b.color)
            g.rect(b.x, b.y, b.side, b.side)
            g.fill()
            g.stroke()
        }
        // console.log(g, blockData)
    },

    // 绘制路径
    drawPath() {
        let g = this.graphics
        let path = this.search.pathPoint
        g.moveTo(path[0].x, path[0].y)
        for (let i = 0; i < path.length; i++) {
            let p = path[i]
            g.lineTo(p.x, p.y)
        }
        g.lineWidth = 3
        g.strokeColor = new cc.Color(255, 255, 0, 255)
        g.stroke()
    },

    // 优化调试用，可查看每个格子的FGH值
    addFGHLabel(block) {
        let grid = this.grid.blockToGrid(block)
        let keys = ['F', 'G', 'H']
        for (let i = 0; i < 3; i++) {
            let name = grid.x + '-' + grid.y + '-' + keys[i]
            let node = new cc.Node(name)
            node.scale = 0.6
            node.x = block.x + 10
            node.y = block.y + 6 * (i + 1)
            node.color = new cc.color(0, 0, 0, 255)
            node.parent = this.canvas.getChildByName('labelLayer')
            let label = node.addComponent(cc.Label)
            label.fontSize = 1
            label.lineHeight = 10
            label.string = keys[i] + ' ' + block[keys[i]]
        }
    },

    showFGH() {
        this.canvas.getChildByName('labelLayer').removeAllChildren()
        let blockData = this.grid.getBlockData()
        blockData.map(i => this.addFGHLabel(i))
    }

    // update (dt) {},
});

import { _decorator, color, Color, Component, EPSILON, instantiate, lerp, math, Node, Prefab, randomRangeInt, resources, Skeleton, sp, Sprite, SpriteFrame, Tween, tween, UITransform, v3, Vec3 } from 'cc';
import { Utils } from '../util/Utils';
import { Monster } from './Monster';
import { Loot } from './Loot';
import { GameState } from '../manager/GameState';
const { ccclass, property } = _decorator;

@ccclass('Cell')
export class Cell extends Component {
    @property(SpriteFrame)
    bg_red:SpriteFrame = null;
    @property(SpriteFrame)
    bg_green:SpriteFrame = null;
    @property(SpriteFrame)
    vfx_bg:SpriteFrame = null;
    @property(SpriteFrame)
    bar_vert:SpriteFrame = null;
    @property(SpriteFrame)
    bar_horz:SpriteFrame = null;
    @property(SpriteFrame)
    deco_tr:SpriteFrame = null;
    @property(SpriteFrame)
    deco_lt:SpriteFrame = null;
    @property(SpriteFrame)
    deco_t:SpriteFrame = null;
    @property(SpriteFrame)
    deco_t_1:SpriteFrame = null;
    @property(SpriteFrame)
    deco_tc:SpriteFrame = null;
    @property(SpriteFrame)
    deco_tr_1:SpriteFrame = null;
    @property(SpriteFrame)
    deco_r:SpriteFrame = null;

    public isEnterable: boolean = true;

    protected static _imageScale:number = 0.125;

    protected static _barHorzIndent:number = 39.2;
    protected static _barHorzWidth:number = 381;
    protected static _barHorzHeight:number = 47;

    protected static _barVertIndent:number = 22.5;
    protected static _barVertWidth:number = 78;
    protected static _barVertHeight:number = 260;

    protected static _avatarYPosScale:number = 0.9;

    protected static COLOR_HIGHLIGHT:Color = new Color(255, 204, 51);

    public static unitWidth = (Cell._barHorzWidth - Cell._barHorzIndent * 2) * Cell._imageScale;
    public static unitHeight = (Cell._barVertHeight - Cell._barVertIndent * 2) * Cell._imageScale;

    private _uiTransform:UITransform = null;

    private _cellSize:number = 1;

    private _leftWall:Node = null;
    private _rightWall:Node = null;
    private _topWall:Node = null;
    private _bottomWall:Node = null;
    private _bgRed:Node = null;
    private _bgGreen:Node = null;
    private _bgEffect:Node = null;

    private _vfxScale : Vec3 = v3(1.1, 1.1, 1);
    private _unitScale:number = 1;

    private _monster:Monster = null;
    private _loot:Loot = null;

    private _index:number = 0;
    private _groupIndex:number = 0;
    private _x:number = 0;
    private _y:number = 0;
    private _cols:number = 0;
    private _rows:number = 0;

    protected _findAvailCellLevel:number = 0;
    protected _blinkColor:Color = Cell.COLOR_HIGHLIGHT.clone();
    protected _blinkCells:Cell[] = [];

    protected _isExpanded:boolean = false;

    public makeMovePath(targetCell:Cell):number[] {
        const ret:number[] = [];
        const workPath:number[] = [];
        
        this.findMovePath(ret, workPath, this._index, targetCell._index);
        return ret;
    }

    protected findMovePath(path:number[], workPath:number[], currentIndex:number, finalIndex:number) {
        const cell = this.node.parent.children[currentIndex].getComponent(Cell);
        if (cell._x > 0) {
            this.findOneMovePath(path, workPath, currentIndex - cell._rows, finalIndex);
        }

        if (cell._x < cell._cols - 1) {
            this.findOneMovePath(path, workPath, currentIndex + cell._rows, finalIndex);
        }

        if (cell._y > 0) {
            this.findOneMovePath(path, workPath, currentIndex - 1, finalIndex);
        }

        if (cell._y < cell._rows - 1) {
            this.findOneMovePath(path, workPath, currentIndex + 1, finalIndex);
        }
    }

    protected findOneMovePath(path:number[], workPath:number[], currentIndex:number, finalIndex:number) : boolean {
        if (workPath.indexOf(currentIndex) >= 0)
            return;

        if (currentIndex == finalIndex) {
            workPath.push(currentIndex);
            if (path.length == 0 || workPath.length < path.length) {
                for (let index = 0; index < workPath.length; index++) {
                    if (index < path.length)
                        path[index] = workPath[index];
                    else
                        path.push(workPath[index]);
                }
                for (let index = path.length - workPath.length; index > 0; index--) {
                    path.pop();
                }
            }
            return true;
        }

        const targetCell = this.node.parent.children[currentIndex].getComponent(Cell);
        if (!targetCell.isValidRoom()) {
            const previousLength = workPath.length;
            workPath.push(currentIndex);
            this.findMovePath(path, workPath, currentIndex, finalIndex);

            while (workPath.length > previousLength)
                workPath.pop();
        }

        return false;
    }

    public blinkAvailCells(blink:boolean, level:number) {
        this.unschedule(this.onblinkAvailCells);

        if (blink) {
            this._findAvailCellLevel = level;
            this.scheduleOnce(this.onblinkAvailCells, 2);
        } else {
            while (this._blinkCells.length > 0) {
                const cell:Cell = this._blinkCells.pop();
                cell.blink(false);
            }
        }
    }

    protected onblinkAvailCells() {
        if (this._blinkCells.length == 0) {
            const workPath:number[] = [];
            
            this.findAvailCells(this._blinkCells, workPath, this._index, this._findAvailCellLevel);
            this._blinkCells.forEach(element => {
                element.blink(true);
            });
        }
    }

    protected findAvailCells(ret:Cell[], workPath:number[], currentIndex:number, level:number) {
        const cell = this.node.parent.children[currentIndex].getComponent(Cell);
        if (cell._x > 0) {
            this.findOneAvailCells(ret, workPath, currentIndex - cell._rows, level);
        }

        if (cell._x < cell._cols - 1) {
            this.findOneAvailCells(ret, workPath, currentIndex + cell._rows, level);
        }

        if (cell._y > 0) {
            this.findOneAvailCells(ret, workPath, currentIndex - 1, level);
        }

        if (cell._y < cell._rows - 1) {
            this.findOneAvailCells(ret, workPath, currentIndex + 1, level);
        }
    }

    protected findOneAvailCells(ret:Cell[], workPath:number[], currentIndex:number, level:number) {
        if (workPath.indexOf(currentIndex) >= 0)
            return;

        const targetCell = this.node.parent.children[currentIndex].getComponent(Cell);
        if (!targetCell.node.active || targetCell._cellSize != this._cellSize)
            return;

        if (targetCell.isValidRoom()) {
            const monster = targetCell.getMonster();
            if (monster && monster.getLevel() >= level)
                return;

            if (ret.indexOf(targetCell) <= 0)
                ret.push(targetCell);

            return;
        }

        const previousLength = workPath.length;
        workPath.push(currentIndex);
        this.findAvailCells(ret, workPath, currentIndex, level);

        while (workPath.length > previousLength)
            workPath.pop();
    }

    public isNeighbour(targetCell:Cell) : boolean {
        const targetNode : Node = targetCell.node;

        // check neighbour?
        const sourceUiTransform:UITransform = this.getUITransform();
        const targetUiTransform:UITransform = targetNode.getComponent(UITransform);
        const sourcePos:Vec3 = this.node.position;
        const targetPos:Vec3 = targetNode.position;

        const horzDelta:number = (sourceUiTransform.width + targetUiTransform.width) / 2 - Math.abs(targetPos.x - sourcePos.x);
        const vertDelta:number = (sourceUiTransform.height + targetUiTransform.height) / 2 - Math.abs(targetPos.y - sourcePos.y);

        return ((/*targetPos.x > sourcePos.x + EPSILON && */Math.abs(horzDelta) < EPSILON && vertDelta + EPSILON >= sourceUiTransform.height / 2) ||
            (Math.abs(vertDelta) < EPSILON && horzDelta + EPSILON >= sourceUiTransform.width));
    }

    public canEnter() : boolean {
        return this.isEnterable;
    }

    public getGameState() : number {
        if (this.isExpanded())
            return GameState.getState();

        if (this._groupIndex <= 1)
            return GameState.State.LEVEL1;

        return this._groupIndex + GameState.State.FALL;
    }
    
    public setup(index:number, cols:number, rows:number, groupIndex:number, x:number, y:number, size:number, left:boolean, right:boolean, top:boolean, bottom:boolean, isEnemy:boolean) : math.Size{
        this._index = index;
        this._rows = rows;
        this._cols = cols;
        this._groupIndex = groupIndex;
        this._x = x;
        this._y = y;

        this._cellSize = size;
        this._unitScale = Cell._imageScale * size;
        
        // this._v3scale.multiplyScalar(size);

        if (!this._uiTransform) {
            this._uiTransform = Utils.addComponentIfNot(this.node, UITransform) as UITransform;
            this._uiTransform.setAnchorPoint(0.5, 0.5);
        }
        this._uiTransform.setContentSize(Cell.unitWidth * this._cellSize, Cell.unitHeight * this._cellSize);

        const contentSize = this._uiTransform.contentSize;

        if (this._bgGreen) {
            this.setUISize(this._bgGreen, contentSize.width * 1.01, contentSize.height);
        } else {
            this._bgGreen = this.createSprite(this.bg_green, contentSize.width * 1.01, contentSize.height);
            this.node.addChild(this._bgGreen);
        }

        if (isEnemy){
            this._bgRed = this.createSprite(this.bg_red, contentSize.width * 1.01, contentSize.height);
            this.node.addChild(this._bgRed);
        }

        if (this._bgEffect) {
            this.setUISize(this._bgEffect, contentSize.width, contentSize.height);
        } else {
            this._bgEffect = this.createSprite(this.vfx_bg, contentSize.width, contentSize.height);
            this.node.addChild(this._bgEffect);
            this._bgEffect.active = false;
        }

        if (right) {
            if (this._rightWall)
                this.expandWall(this._rightWall, contentSize.width / 2, 0);
            else
                this._rightWall = this.addWall('right', this.bar_vert, false, contentSize.width / 2, 0);
        }
        if (top){
            if (this._topWall) {
                this._topWall.active = true;
                this.expandWall(this._topWall, 0, contentSize.height / 2);
            } else {
                this._topWall = this.addWall('top', this.bar_horz, true, 0, contentSize.height / 2);
            }
        }
        if (bottom) {
            if (this._bottomWall)
                this.expandWall(this._bottomWall, 0, -contentSize.height / 2);
            else
                this._bottomWall = this.addWall('bottom', this.bar_horz, true, 0, -contentSize.height / 2);
        }
        if (left){
            if (this._leftWall) {
                this._leftWall.active = true;
                this.expandWall(this._leftWall, -contentSize.width / 2, 0);
            } else {
                this._leftWall = this.addWall('left', this.bar_vert, false, -contentSize.width / 2, 0);
                if (groupIndex > 0) {
                    if (randomRangeInt(0,5) == 0){
                        const deco = this.createSprite(this.deco_r, 0, 0, this._unitScale);
                        this._leftWall.addChild(deco);                
                        deco.setPosition(v3(-contentSize.width / 2, 0, 0))
                    }
                    if (randomRangeInt(0,5) == 0){
                        const deco = this.createSprite(this.deco_lt, 0, 0, this._unitScale, 0, 1);
                        this._leftWall.addChild(deco);                
                        deco.setPosition(v3(-contentSize.width / 2, contentSize.height / 2, 0))
                    }     
    
                    if (randomRangeInt(0,5) == 0){
                        const deco = this.createSprite(this.deco_tc, 0, 0, this._unitScale);
                        this._leftWall.addChild(deco);                
                        deco.setPosition(v3(0, contentSize.height / 2, 0));
                    } else if (randomRangeInt(0,6) == 0){
                        const deco = this.createSprite(this.deco_t, 0, 0, this._unitScale, 0.5, 0.65);
                        this._leftWall.addChild(deco);                
                        deco.setPosition(v3(0, contentSize.height / 2, 0))
                    } else if (randomRangeInt(0,6) == 0){
                        const deco = this.createSprite(this.deco_t_1, 0, 0, this._unitScale, 0.5, 0.65);
                        this._leftWall.addChild(deco);                
                        deco.setPosition(v3(0, contentSize.height / 2, 0))
                    }
                    
                    if (x > 0) {
                        if (randomRangeInt(0,6) < 2){
                            const deco = this.createSprite(this.deco_tr, 0, 0, this._unitScale);
                            this._leftWall.addChild(deco);
                            deco.setPosition(v3(-contentSize.width / 2, contentSize.height / 2, 0))
                        } else if (randomRangeInt(0,6) == 0){
                            const deco = this.createSprite(this.deco_tr_1, 0, 0, this._unitScale, 0.4, 0.7);
                            this._leftWall.addChild(deco);                
                            deco.setPosition(v3(-contentSize.width / 2, contentSize.height / 2, 0))
                        }
                    }
                }
            }
        }

        return contentSize;
    }

    public expand2() {
        const group = this.node.parent.children;
        if (this._x > 0) {
            group[this._index - this._rows].active = false;
        }

        if (this._y > 0) {
            group[this._index - 1].active = false;
            group[this._index - this._rows - 1].active = false;
        }

        if (this._y + 1 < this._rows) {
            group[this._index + 1].getComponent(Cell)?.removeTopLeftDecos();
            if (this._x > 0)
                group[this._index - this._rows + 1].getComponent(Cell)?.removeTopLeftDecos();
        }

        const pos = this.node.position.clone();
        pos.x -= this._uiTransform.contentSize.width / 2;
        pos.y += this._uiTransform.contentSize.height / 2;
        this.node.setPosition(pos);

        this.recoverWall(true);
        // this.recoverWall(false);
        
        this.setup(this._index, this._cols, this._rows, this._groupIndex, this._x, this._y, this._cellSize * 2, true, false, true, true, false);

        if (this._bottomWall && this._bottomWall.active) {
            // for z-order up
            const worldPos = this._bottomWall.getWorldPosition();
            this._bottomWall.setParent(this.node.getParent().getParent());
            this._bottomWall.setWorldPosition(worldPos);
        }
        this._isExpanded = true;
    }

    public getUITransform() : UITransform {
        return this._uiTransform;
    }

    public getCellSize() : number {
        return this._cellSize;
    }

    public static getCellIndexFromPos(group:Node, worldPos:Vec3):number {
        for (let index = 0; index < group.children.length; index++) {
            const element = group.children[index];
            if (element.active && Utils.isWorldPosInUINodeRect(worldPos, element))
                return index;
        }

        return -1;
    }

    protected addWall(groupName:string, spriteFrame:SpriteFrame, isHorz:boolean, centerX:number, centerY:number) : Node {
        const group = new Node(groupName);

        const bar = this.createSprite(spriteFrame, 0, 0, this._unitScale);
        group.addChild(bar);
        bar.setPosition(v3(centerX, centerY, 0));
/*
        let x:number = centerX;
        let y:number = centerY;
        if (isHorz)
            x -= (this._cellSize - 1) * Cell.unitWidth / 2;
        else
            y -= (this._cellSize - 1) * Cell.unitHeight / 2;

        for (let index = 0; index < this._cellSize; index++) {
            const piece = index == 0 ? bar : instantiate(bar);

            group.addChild(piece);

            piece.setPosition(v3(x, y, 0));

            if (isHorz)
                x += Cell.unitWidth;
            else
                y += Cell.unitHeight;
        }
*/
        this.node.addChild(group);

        return group;
    }

    protected expandWall(wallNode:Node, centerX:number, centerY:number) {
        for (let index = wallNode.children.length - 1; index > 0; index--) {
            const element = wallNode.children[index];
            // element.removeFromParent();
            // element.destroy();
            element.active = false;
        }

        const bar = wallNode.children[0];
        const uiTransform = bar.getComponent(UITransform);
        const width = uiTransform.contentSize.width * 2, height = uiTransform.contentSize.height * 2;

        uiTransform.setContentSize(width, height);

        bar.setPosition(v3(centerX, centerY, 0));
    }

    protected isExpanded() : boolean {
        return this._isExpanded;
    }

    protected createSprite(spriteFrame:SpriteFrame, width:number=0, height:number=0, scale:number=1, anchorX:number=0.5, anchorY:number=0.5) : Node {
        const node:Node = new Node();
        const uiTransform = node.addComponent(UITransform);
        uiTransform.setAnchorPoint(anchorX, anchorY);
        const sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;

        sprite.spriteFrame = spriteFrame as SpriteFrame;
        if (width == 0)
            width = spriteFrame.width * scale;
        if (height == 0)
            height = spriteFrame.height * scale;

        uiTransform.setContentSize(width, height);

        return node;
    }

    protected setUISize(node:Node, width:number, height:number) {
        const uiTransform = node.getComponent(UITransform);
        uiTransform.setContentSize(width, height);
    }

    start() {
    }

    // update(deltaTime: number) {
    // }

    protected placeItem(item:Node, isRight:boolean, disp:number = 1) {
        const uiTransform:UITransform = item.getComponent(UITransform);
        const scale = this._uiTransform.height * disp / uiTransform.height;

        this.node.addChild(item);
        item.setScale(v3(scale, scale, 1));

        if (isRight)
            item.setPosition(v3(this._uiTransform.width / 2 - uiTransform.width / 2 * scale,
                this._uiTransform.height * (1 - disp - 0.5)));
    }

    getPlayerWorldPos(playerNode:Node, outWorldPos:Vec3) {
        const uiTransform:UITransform = playerNode.getComponent(UITransform);
        const scale = this._uiTransform.height * Cell._avatarYPosScale / uiTransform.height;

        outWorldPos.set(this.node.worldPosition.x + 
                ((this._monster && this._monster.node.active) ? 
                    (-this._uiTransform.width / 2 + uiTransform.width / 2 * scale) : 0),
            this.node.worldPosition.y + this._uiTransform.height * (1 - Cell._avatarYPosScale - 0.5));
    }

    placeMonster(item:Node, level:number) {
        this.placeItem(item, true, Cell._avatarYPosScale);

        if (level > 0) {
            this._monster = item.getComponent(Monster);
            if (this._monster)
                this._monster.setLevel(level);
        }
    }

    placeLoot(item:Node) {
        this.placeItem(item, false);
        this._loot = item.getComponent(Loot);

        this._bgRed.active = false;
    }

    blink(blink:boolean) {
        if (this._bgEffect) {
            this._bgEffect.active = blink;

            const sprite:Sprite = this._bgEffect.getComponent(Sprite);
            Tween.stopAllByTarget(sprite);

            if (blink) {
                this._blinkColor.a = 0;
                sprite.color = this._blinkColor;

                const color = this._blinkColor;

                tween(sprite)
                .repeatForever(
                    tween()
                    .to(1, { color: Cell.COLOR_HIGHLIGHT }, {onUpdate(target, ratio) {
                        color.a = ratio * 255;
                        sprite.color = color;
                    },})
                    .to(1, { color: color }, {onUpdate(target, ratio) {
                        color.a = (1 - ratio) * 255;
                        sprite.color = color;
                    },})
                )
                .start();
            }
        }
    }

    blinkRedOnce() {
        if (this._bgEffect) {
            this._bgEffect.active = true;

            const sprite:Sprite = this._bgEffect.getComponent(Sprite);
            Tween.stopAllByTarget(sprite);

            const color = Color.RED.clone();
            sprite.color = color;
            tween(sprite)
            .to(0.5, { color: color }, {onUpdate(target, ratio) {
                color.a = (1 - ratio) * 255;
                sprite.color = color;
            },})
            .call(()=>{
                this._bgEffect.active = false;
            })
            .start();
        }
    }

    highlight(enable:boolean) {
        if (this._bgEffect && this.isValidRoom()) {
            const sprite:Sprite = this._bgEffect.getComponent(Sprite);
            Tween.stopAllByTarget(sprite);
            sprite.color = Cell.COLOR_HIGHLIGHT;

            const itemHighlight = enable ? Cell.COLOR_HIGHLIGHT : null;
            if (this._monster)
                this._monster.highlight(itemHighlight);
            if (this._loot)
                this._loot.highlight(itemHighlight);

            this._bgEffect.active = enable;
        }
    }

    isEmpty(): boolean {
        return this._loot == null && this._monster == null;
    }

    isValidRoom() :boolean {
        return (this.getMonster() && this.getMonster().getLevel() > 0) || (this.getLoot() && this.getLoot().getLevel() > 0);
    }

    public getMonster() : Monster {
        return this._monster;
    }

    public getLoot() : Loot {
        return this._loot;
    }

    public recoverWall(left:boolean) {
        const wall = left ? this._leftWall : this._rightWall;
        if (wall) {
            // Tween.stopAllByTarget(wall);

            wall.active = true;
            // wall.setScale(Vec3.ONE);
            // wall.setRotationFromEuler(Vec3.ZERO);
        }
    }

    public removeWall(left:boolean) : boolean {
        const wall = left ? this._leftWall : this._rightWall;
        if (wall && wall.active) {
            wall.active = false;
            // const tweenDuration:number = 0.1;
            // tween(wall)
            // .to(tweenDuration, { scale:Cell._vec3half })
            // .to(tweenDuration, { angle:90 }, {
            //     onComplete(target) {
            //         wall.setScale(Vec3.ONE);
            //         wall.setRotationFromEuler(Vec3.ZERO);
            //         wall.active = false;
            // },})
            // .start();

            return true;
        }

        return false;
    }

    protected removeTopLeftDecos() {
        if (this._leftWall && this._leftWall.active) {
            for (let index = 1; index < this._leftWall.children.length; index++) {
                const element = this._leftWall.children[index];
                element.active = false;                
            }
        }

        if (this._topWall && this._topWall.active) {
            for (let index = 1; index < this._topWall.children.length; index++) {
                const element = this._topWall.children[index];
                element.active = false;                
            }
        }
    }

    // protected removeTopWall() {
    //     if (this._topWall && this._topWall.active)
    //         this._topWall.active = false;
    // }

    public occupy() {
        if (this._bgEffect) {
            this._bgEffect.active = true;

            const sprite:Sprite = this._bgEffect.getComponent(Sprite);
            Tween.stopAllByTarget(sprite);

            const color = new Color(255, 0, 0, 128);
            sprite.color = color;
            tween(sprite)
            .to(0.1, { color: color }, {onUpdate(target, ratio) {
                color.a = (1 - ratio) * 128;
                sprite.color = color;
            },})
            .call(()=>{
                this._bgEffect.active = false;
            })
            .start();
        }

        if (this._bgRed)
            this._bgRed.active = false;
        if (this._monster)
            this._monster.hideEffect(0.5);
        if (this._loot)
            this._loot.hideEffect(0.5);
    }

    public boundceScaleVfx() {
        tween(this.node)
        .to(0.1, {scale:this._vfxScale}, {easing:'expoIn'})
        .to(0.1, {scale:Vec3.ONE}, {easing:'expoIn'})
        .start();
    }
}



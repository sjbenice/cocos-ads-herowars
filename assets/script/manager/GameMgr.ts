import { _decorator, Camera, CCFloat, Component, director, EPSILON, EventMouse, EventTouch, game, Input, input, instantiate, lerp, math, Node, Prefab, randomRange, randomRangeInt, Size, sys, Toggle, Tween, UITransform, v3, Vec3 } from 'cc';
import { Cell } from '../item/Cell';
import { SoundMgr } from './SoundMgr';
import { Loot } from '../item/Loot';
import { Player } from '../item/Player';
import { Utils } from '../util/Utils';
import GameCamera from '../item/GameCamera';
import super_html_playable from '../super_html_playable';
import { GameState } from './GameState';
import { MonstrousArrange } from '../util/MonstrousArrange';
const { ccclass, property } = _decorator;

@ccclass('GameMgr')
export class GameMgr extends Component {
    static VERSION = {
        FULL: 1,
        THREE_TAP: 2,
        FIRST_TAP_NO_INTRO: 3,
    };

    private static _instance: GameMgr = null;

    @property(Node)
    startPos:Node = null;
    @property(Prefab)
    cellPrefab:Prefab = null;

    @property(Prefab)
    monsterPrefabs:Prefab[] = [];
    @property(Prefab)
    lootPrefab:Prefab = null;

    @property(Player)
    player:Player = null;

    @property
    tutorDelaySeconds:number = 2;

    @property(Node)
    retryScreen:Node = null;

    @property(Node)
    playControl:Node = null;

    @property(Node)
    loadingControl:Node = null;

    @property(Node)
    btnSound:Node = null;

    @property(Node)
    btnInstall:Node = null;

    @property(Node)
    leftLogo:Node = null;

    @property(Node)
    rightLogo:Node = null;

    @property(Node)
    playNow:Node = null;

    @property(Node)
    cameraNode:Node = null;
    @property(Node)
    cameraPosGroup:Node = null;
    
    private static CAMERA_FOLLOW_SPEED : number = 2;
    protected _cameraMaxHalfDimension: Size = Size.ZERO.clone();
    protected _canvasSize: Size = Size.ZERO.clone();
    private _cameraTargetPos:Vec3 = Vec3.ZERO.clone();
    private _cameraTempPos:Vec3 = Vec3.ZERO.clone();
    private _firstUpdate:boolean = true;
    private _isStartEffect:boolean = true;
    private _followState:number = GameState.getState();
    private _cameraHeightSpeed:number = 2;
    private _camera3d:Camera = null;

    // [cols, rows, size]
    protected static _dimensions:number[][] = [[1,1,1], [3,7,1], [3,6,2], [3,6,4], [2,5,8]];
    
    protected static _lootBaseLevel = 5;
    public static GAL_START_LEVEL = 3;
    public static GAL_START_MULTIPLY = 2;
    
    private _pressing:boolean = false;
    private _tempUIPos:Vec3 = Vec3.ZERO.clone();
    private _tempWorldPos:Vec3 = Vec3.ZERO.clone();
    private _gameCamera:GameCamera = null;

    private _version:number = GameMgr.VERSION.FULL;
    private _tapCount:number = 0;
    private _goingToFirstScene : boolean = false;
    private _isPlayerFall:boolean = false;

    private _firstLast:boolean = true;
    private _lastTimer:number = 0;

    onLoad() {
        if (GameMgr._instance) {
            this.node.destroy();
            return;
        }

        GameMgr._instance = this;
        // director.addPersistRootNode(this.node);

        this._gameCamera = this.getComponent(GameCamera);

        this._version = parseInt(Utils.getUrlParameter('version'), 10);
        if (!this._version) {
            this._version = super_html_playable.version();//GameMgr.VERSION.FULL;
        }

        if (super_html_playable.hideAllButton()) {
            if (this.btnSound)
                this.btnSound.active = false;
            if (this.btnInstall)
                this.btnInstall.active = false;
        } else if (super_html_playable.hideSoundButton()) {
            if (this.btnSound)
                this.btnSound.active = false;
            if (this.btnInstall) {
                const widget = this.btnInstall.getComponent(MonstrousArrange);
                widget.isLeft = true;
                widget.adjustPosition(true);
            }
        }

        if (super_html_playable.rightLogo()) {
            if (this.leftLogo)
                this.leftLogo.active = false;
            if (this.rightLogo)
                this.rightLogo.active = true;
        }

        console.log(this._version);
    }

    protected onDestroy(): void {
        if (GameMgr._instance == this)
            GameMgr._instance = null;

        if (!GameMgr.isTouchDevice()) {
            input.off(Input.EventType.MOUSE_DOWN, this._onInputMouseDown, this);
            input.off(Input.EventType.MOUSE_MOVE, this._onInputMouseMove, this);
            input.off(Input.EventType.MOUSE_UP, this._onInputMouseUp, this);
            // if (HTML5) {
            //     document.removeEventListener('pointerlockchange', this._onPointerlockchange);
            // }
        } else {
            // this.node.off(Node.EventType.TOUCH_START, this._onThisNodeTouchStart, this);
            // this.node.off(Node.EventType.TOUCH_END, this._onThisNodeTouchEnd, this);
            // this.node.off(Node.EventType.TOUCH_CANCEL, this._onThisNodeTouchCancelled, this);
            // this.node.off(Node.EventType.TOUCH_MOVE, this._onThisNodeTouchMove, this);
            input.off(Input.EventType.TOUCH_START, this._onThisNodeTouchStart, this);
            input.off(Input.EventType.TOUCH_MOVE, this._onThisNodeTouchMove, this);
            input.off(Input.EventType.TOUCH_END, this._onThisNodeTouchEnd, this);
            input.off(Input.EventType.TOUCH_CANCEL, this._onThisNodeTouchCancelled, this);
        }
    }

    start() {
        super_html_playable.track_gtag('playableStart');

        if (this.loadingControl)
            this.loadingControl.active = true;
        else
            GameState.setState(GameState.State.WORM);

        this._camera3d = this.cameraNode.getComponent(Camera);
        this._cameraMaxHalfDimension.set(this.cameraNode.position.x, this.cameraNode.position.y);
        this._canvasSize = this.getComponent(UITransform).contentSize;

        const topLeft = Vec3.ZERO.clone();

        let baseLevel = GameMgr.GAL_START_LEVEL;
        let sumLevel = 0;

        for (let index = 0; index < GameMgr._dimensions.length; index++) {
            const group = GameMgr._dimensions[index];
            const roomSize = group[2];
            const roomWidth = Cell.unitWidth * roomSize;
            const roomHeight = Cell.unitHeight * roomSize;

            let lootPlaceIndice:number[] = null;

            if (index > 0) {
                const previousGroup = GameMgr._dimensions[index - 1];
                topLeft.y += Math.floor((group[1] * group[2] - previousGroup[1] * previousGroup[2]) / 2) * Cell.unitHeight;

                if (index < GameMgr._dimensions.length - 1)
                    lootPlaceIndice = this.createDistributedRandomInt(group[1], 2, 
                                        (GameMgr._dimensions[index][1] % 2) == (GameMgr._dimensions[index + 1][1] % 2));
            }

            for (let x = 0; x < group[0]; x ++) {
                for (let y = 0; y < group[1]; y ++) {
                    const room = instantiate(this.cellPrefab);
                    const cell = room.getComponent(Cell);

                    cell.setup(this.startPos.children.length, group[0], group[1], index, x, y, roomSize, true, index == GameMgr._dimensions.length - 1, true, y == group[1] - 1, true);
                    this.startPos.addChild(room);
                    room.setPosition(v3(topLeft.x + roomWidth / 2, topLeft.y - roomHeight / 2));

                    if (index > 0){
                        let loot: Node = null;

                        if (x == group[0] - 1 && index < GameMgr._dimensions.length - 1) {
                            const checkIndex:number = lootPlaceIndice.indexOf(y);
                            if (checkIndex >= 0){
                                loot = instantiate(this.lootPrefab);
                                if (!loot.getComponent(Loot).setup((index - 1) * 2 + checkIndex, GameMgr._lootBaseLevel * (1 + checkIndex))) {
                                    loot.destroy();
                                    loot = null;
                                }
                            }
                        }

                        if (loot) {
                            cell.placeLoot(loot);
                        } else {
                            let level : number = 0;
                            level = baseLevel - 1;//randomRangeInt(baseLevel / 2, baseLevel);
                            sumLevel += level;// * 0.75;
                            const monster:Node = instantiate(this.monsterPrefabs[index - 1]);
                            cell.placeMonster(monster, level);

                            if (index == GameMgr._dimensions.length - 1) {
                                cell.isEnterable = false;
                            }
                        }
                    }

                    topLeft.y -= Cell.unitHeight * roomSize;
                }
                topLeft.x += roomWidth;
                topLeft.y += roomHeight * group[1];

                // if (index > 0 && !(index == 1 && x == 0))
                //     baseLevel = sumLevel;
            }

            if (index > 0) {
                // baseLevel *= GameMgr._lootBaseLevel;
                baseLevel = Math.floor(sumLevel / 4) * GameMgr._lootBaseLevel;
            }
        }

        if (this.player) {
            this.player.setLevel(GameMgr.GAL_START_LEVEL * GameMgr.GAL_START_MULTIPLY);
        }

        if (!GameMgr.isTouchDevice()) {
            input.on(Input.EventType.MOUSE_DOWN, this._onInputMouseDown, this);
            input.on(Input.EventType.MOUSE_MOVE, this._onInputMouseMove, this);
            input.on(Input.EventType.MOUSE_UP, this._onInputMouseUp, this);
            // if (HTML5) {
            //     document.addEventListener('pointerlockchange', this._onPointerlockchange);
            // }
        } else {
            input.on(Input.EventType.TOUCH_START, this._onThisNodeTouchStart, this);
            input.on(Input.EventType.TOUCH_MOVE, this._onThisNodeTouchMove, this);
            input.on(Input.EventType.TOUCH_END, this._onThisNodeTouchEnd, this);
            input.on(Input.EventType.TOUCH_CANCEL, this._onThisNodeTouchCancelled, this);

            // this.node.on(Node.EventType.TOUCH_START, this._onThisNodeTouchStart, this);
            // this.node.on(Node.EventType.TOUCH_END, this._onThisNodeTouchEnd, this);
            // this.node.on(Node.EventType.TOUCH_CANCEL, this._onThisNodeTouchCancelled, this);
            // this.node.on(Node.EventType.TOUCH_MOVE, this._onThisNodeTouchMove, this);
        }
    }

    update(deltaTime: number) {
        if (this.player) {
            if (this.player.isFinished() && !this._goingToFirstScene) {
                this.gotoFirstScene();
            }
        }

        if (!this._firstLast) {
            this._lastTimer += deltaTime;
        } else
            this._firstLast = false;
    }

    protected lateUpdate(dt: number): void {
        if (GameState.isChanged()) {
            const state = GameState.getState();
            this._followState = state;
        }

        if (this.cameraNode) {
            if (this.cameraPosGroup && this._followState >= 0 && this._followState < this.cameraPosGroup.children.length) {
                const curCameraPosNode = this.cameraPosGroup.children[this._followState];
                curCameraPosNode.getWorldPosition(this._cameraTempPos);
                this.cameraNode.getWorldPosition(this._cameraTargetPos);

                if (this._firstUpdate) {
                    this.cameraNode.setWorldPosition(this._cameraTempPos);
                } else {
                    this._cameraTargetPos.lerp(this._cameraTempPos, dt * GameMgr.CAMERA_FOLLOW_SPEED);
                    this.cameraNode.setWorldPosition(this._cameraTargetPos);
                }
                const uiTransform = curCameraPosNode.getComponent(UITransform);
                if (uiTransform) {
                    let targetOrthoHeight:number = uiTransform.height / 2;
                    if (this._canvasSize.width < this._canvasSize.height) {
                        targetOrthoHeight = targetOrthoHeight / this._canvasSize.width * this._canvasSize.height;
                    }

                    if (this._firstUpdate) {
                        this._camera3d.orthoHeight = targetOrthoHeight;
                    } else {
                        this._camera3d.orthoHeight = lerp(this._camera3d.orthoHeight, 
                            targetOrthoHeight, dt * this._cameraHeightSpeed);
                    }
                }

                this._firstUpdate = false;
            }
        }

        if (this._isStartEffect) {
            this._isStartEffect = false;
            if (this._version == GameMgr.VERSION.FIRST_TAP_NO_INTRO) {
                GameState.setState(GameState.State.LEVEL1);
                if (this.player) {
                    this.player.fall(this.startPos.children[0].getComponent(Cell), GameMgr.GAL_START_LEVEL, true);
                }
            } else {
                this.scheduleOnce(()=>{
                    GameState.setState(GameState.State.FALL);
                    this.scheduleOnce(()=>{
                        if (this.player) {
                            this.player.fall(this.startPos.children[0].getComponent(Cell), GameMgr.GAL_START_LEVEL, false);
                        }
                    }, 1);
                }, GameCamera.TIME_WORM);
            }
        }
    }
    
    public static isTouchDevice() {
        return sys.hasFeature(sys.Feature.INPUT_TOUCH);
    }

    protected createDistributedRandomInt(total:number, length:number, odd:boolean):number[] {
        const ret : number[] = [];
        const unit : number = total / length;
        for (let index = 0; index < length; index++) {
            let value:number = Math.floor(unit * (index + 0.5));// + randomRangeInt(0, unit);
            if (odd) {
                if ((value % 2) > 0)
                    value --;
            } else {
                if ((value % 2) == 0) {
                    value --;
                }
            }
            ret.push(value);
        }

        // console.log(ret)
        return ret;
    }
    
    public gotoFirstScene() {
        if (this._goingToFirstScene)
            return;

        this._goingToFirstScene = true;

        this.scheduleOnce(()=>{
            const scheduler = director.getScheduler();
            scheduler.unscheduleAll();
            Tween.stopAll();

            this.playControl.active = false;
            this.playNow.active = true;

            SoundMgr.playSound('win');
            SoundMgr.stopMusic();
            // this.node.destroy();
            // SoundMgr.destroyMgr();
            // director.loadScene("first");

            // this._goingToFirstScene = false;

            super_html_playable.game_end();
        }, 1.5);
    }

    onToggleSound(target: Toggle) {
        SoundMgr.onSound(target.isChecked);

        super_html_playable.track_gtag('sound');
    }

    onBtnRetry() {
        if (this.retryScreen) {
            this.retryScreen.active = false;
        }
    }

    onBtnLogo() {
        if (!super_html_playable.hideAllButton()) {
            super_html_playable.track_gtag('logo');
            super_html_playable.download();
        }
    }

    onBtnInstall() {
        super_html_playable.track_gtag('installBtn');
        super_html_playable.download();
    }

    private _onPointerlockchange() {
        if (document.pointerLockElement !== game.canvas) {
            if (GameMgr._instance)
                GameMgr._instance._onClickOrTouchEnd();
        }
    }

    private _onInputMouseDown(event: EventMouse) {
        switch (event.getButton()) {
            default:
                break;
            case EventMouse.BUTTON_LEFT:
                this._onClickOrTouch(event.getUILocationX(), event.getUILocationY(), false);
                break;
        }
    }

    private _onInputMouseMove(event: EventMouse) {
        this._onClickOrTouchMove(event.getUILocationX(), event.getUILocationY());
    }

    private _onInputMouseUp (event: EventMouse) {
        switch (event.getButton()) {
            default:
                break;
            case EventMouse.BUTTON_LEFT:
                this._onClickOrTouchEnd();
                break;
        }
    }

    private _onThisNodeTouchStart (touchEvent: EventTouch) {
        const touch = touchEvent.touch;
        if (!touch) {
            return;
        }

        this._onClickOrTouch(touch.getUILocationX(), touch.getUILocationY(), false);
    }

    private _onThisNodeTouchEnd () {
        this._onClickOrTouchEnd();
    }
    
    private _onThisNodeTouchCancelled () {
        this._onThisNodeTouchEnd();
    }

    private _onThisNodeTouchMove (touchEvent: EventTouch) {
        const touch = touchEvent.touch;
        if (!touch) {
            return;
        }

        this._onClickOrTouchMove(touch.getUILocationX(), touch.getUILocationY());
    }

    private _onClickOrTouch(x: number, y: number, moving:boolean) {
        SoundMgr.onFirstClick();

        if (this.retryScreen?.active || this.playNow?.active)
            return;

        if (this.player) {
            if (!this.player.canInput()) {
                this.player.setStopMoving();
                return;
            }

            this.player.enableMove(false);
        }
        this._pressing = true;

        this.showHideTutor(false);

        this._doClickOrTouch(x, y, moving);

        // Check if the method exists before calling it
/*        if (game.canvas?.requestPointerLock) {
            const maybePromise = game.canvas.requestPointerLock() as unknown as Promise<unknown> | undefined;
            
            // Optionally handle the promise if it exists
            if (maybePromise instanceof Promise) {
                maybePromise.then(() => {
                    // console.log('Pointer lock request was successful.');
                }).catch((error) => {
                    // console.error('Pointer lock request failed:', error);
                });
            } else {
                // console.log('Pointer lock request is not supported.');
            }
        } else {
            // console.log('Pointer lock API is not available.');
        }*/
    }

    private _doClickOrTouch(x: number, y: number, moving:boolean) {
        this._tempUIPos.set(x, y , 0);
        this._gameCamera.getWorldPosFromUI(this._tempUIPos, this._tempWorldPos);

        let index:number = Cell.getCellIndexFromPos(this.startPos, this._tempWorldPos);
        if (this.player) {
            if (index >= 0 && index < this.startPos.children.length) {
                const cell:Cell = this.startPos.children[index].getComponent(Cell);
                this.player.resetMoveCellAfter(cell);

                const lastCell:Cell = this.player.getLastCell();
                if (lastCell && lastCell == cell) {
                    index = -1;
                } else {
                    if (lastCell.isNeighbour(cell)) {
                        if (this.canEnter(index)) {
                            if (this.player.addMoveCell(cell)) {
                                index = -1;
                                if (!moving && cell.isValidRoom())
                                    cell.boundceScaleVfx();
                            }
                        }
                    } else {
                        const movePath:number[] = lastCell.makeMovePath(cell);
                        if (movePath && movePath.length > 0) {
                            for (let i = 0; i < movePath.length; i++) {
                                const element = movePath[i];
                                if (this.canEnter(element)) {
                                    if (this.player.addMoveCell(this.startPos.children[element].getComponent(Cell)))
                                        index = -1;
                                    else
                                        break;
                                }
                            }

                            if (index == -1 && !moving && cell.isValidRoom())
                                cell.boundceScaleVfx();
                        }
                    }
                }
            } 
        }
        
        if (index >= 0) {
            const targetNode : Node = this.startPos.children[index];
            if (targetNode) {
                const cell : Cell = targetNode.getComponent(Cell);
                if (cell) {
                    cell.blinkRedOnce();
                }
            }
        }

        if (this.player)
            this.player.updateMouseTrack(this._tempWorldPos, false);

        if (!moving)
            super_html_playable.game_interaction();
    }

    private _onClickOrTouchEnd() {
        this.showHideTutor(true);

        if (this._pressing) {
            this._pressing = false;

            if (this.player) {
                if (this.player.enableMove(true))
                    this.onPlayerTap();
            }
        }
    }

    private _onClickOrTouchMove(x: number, y: number) {
        if (this._pressing) {
            this._doClickOrTouch(x, y, true);
        }
    }

    private showHideTutor(show:boolean){
        if (this.player)
            this.player.showTutor(show);
    }

    private canEnter(index:number) : boolean {
        if (this.startPos && this.player && index >= 0 && index < this.startPos.children.length) {
            const targetNode : Node = this.startPos.children[index];
            const cell:Cell = targetNode.getComponent(Cell);
            const targetUiTransform:UITransform = targetNode.getComponent(UITransform);

            // check height
            if (cell.canEnter() && targetUiTransform && this.player.getRealHeight() < targetUiTransform.height) {
                return true;
            }
        }

        return false;
    }

    protected onPlayerTap() {
        if (this._tapCount == 0)
            super_html_playable.track_gtag('firstClick');

        this._tapCount ++;

        if ((this._version == GameMgr.VERSION.THREE_TAP && this._tapCount == 3) ||
            this._version == GameMgr.VERSION.FIRST_TAP_NO_INTRO)
            this.gotoFirstScene();
    }
}

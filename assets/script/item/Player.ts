import { _decorator, Component, EPSILON, instantiate, Node, Prefab, random, randomRange, Size, sp, tween, UITransform, v3, Vec3 } from 'cc';
import { LevelCaption } from './LevelCaption';
import { Cell } from './Cell';
import { Tutor } from './Tutor';
import { Monster } from './Monster';
import { Loot } from './Loot';
import { SoundMgr } from '../manager/SoundMgr';
import { GameState } from '../manager/GameState';
import super_html_playable from '../super_html_playable';
const { ccclass, property } = _decorator;

@ccclass('Player')
export class Player extends Component {
    public static STATE = {
        WAIT:-1,
        IDLE:0,
        FALL:1,
        STANDUP:2,
        RUN:3,
        JUMP:4,
        ATTACK:5,
        DEATH:6,
        UPGRADE:7,
    };

    protected static JUMP_STATE = {
        NONE:-1,
        START:0,
        UP:1,
        DOWN:2,
    }
    @property
    timeScale:number = 1;

    @property(Node)
    avatar:Node = null;
    @property(Node)
    subAvatar:Node = null;

    @property(LevelCaption)
    levelCaption:LevelCaption = null;

    @property(sp.Skeleton)
    goddesSkeleton:sp.Skeleton = null;

    @property(Node)
    rockGroup:Node = null;

    @property(sp.Skeleton)
    weaponSkeleton:sp.Skeleton = null;
    @property(sp.Skeleton)
    bodySkeleton:sp.Skeleton = null;
    @property(sp.Skeleton)
    headSkeleton:sp.Skeleton = null;

    @property(Tutor)
    tutor:Tutor = null;

    @property(Node)
    retryScreen:Node = null;
    @property(Node)
    retryIcon:Node = null;

    @property(Node)
    drops:Node = null;
    @property(Node)
    dropsVfx:Node = null;
    @property(Node)
    hitVfx:Node = null;

    @property(Prefab)
    ruinEffect:Prefab = null;

    protected _worldPos:Vec3 = Vec3.ZERO.clone();
    protected _worldPos2:Vec3 = Vec3.ZERO.clone();
    protected _tutorPos:Vec3 = Vec3.ZERO.clone();

    protected _localPos1:Vec3 = Vec3.ZERO.clone();
    protected _localPos2:Vec3 = Vec3.ZERO.clone();
    
    protected _invertScale:Vec3 = v3(-1, 1, 1);

    protected _contentSize:Size = null;

    protected _state:number = Player.STATE.IDLE;
    protected _cells:Cell[] = [];
    protected _isMovable:boolean = false;
    protected _finish:boolean = false;
    protected _noMovedYet:boolean = true;
    protected _stopMoving:boolean = false;

    protected static _moveTime: number = 0.3;

    // protected _jumpState:number = Player.JUMP_STATE.NONE;
    // protected _moving:boolean = false;
    // protected _moveElapsedTime:number = 0;
    protected _curMoveSourceLocalPos:Vec3 = Vec3.ZERO.clone();
    protected _curMoveTaretLocalPos:Vec3 = Vec3.ZERO.clone();

    protected _dropVfxScale:Vec3 = v3(1.2, 1.2, 1);
    protected _dropVfxScale2:Vec3 = v3(6, 6, 1);

    public isFinished() : boolean {
        return this._finish;
    }

    public canInput() : boolean {
        return this._state == Player.STATE.IDLE && this._cells.length == 1;
    }

    public setStopMoving() {
        this._stopMoving = true;
    }

    public getRealHeight() : number {
        return this._contentSize.height * this.node.scale.y;
    }

    public getFollowParams(outWorldPos:Vec3) : number {
        let length = this.getRealHeight() * 8;
        this.node.getWorldPosition(outWorldPos);

        if (this._state == Player.STATE.FALL) {
            // length *= 0.8;
        } else {
            // if (this._state != Player.STATE.IDLE)
            //     length *= 0.8;

            outWorldPos.x += length * 0.18;
            outWorldPos.y += length * 0.12;
        }

        return length;
    }

    public getLastCell() : Cell {
        return this._cells.length > 0 ? this._cells[this._cells.length - 1] : null;
    }

    public resetMoveCellAfter(cell:Cell) : boolean {
        const index = this._cells.indexOf(cell);
        if (index >= 0 && index < this._cells.length - 1) {
            for (let i = this._cells.length - 1; i > index; i--) {
                const element = this._cells.pop();
                element.highlight(false);
            }

            if (this.tutor)
                this.tutor.hideTrack();

            for (let i = 1 ; i <= index ; i ++) {
                this._cells[i].node.getWorldPosition(this._worldPos);
                this.updateMouseTrack(this._worldPos, true);
            }
        }

        return index >= 0;
    }

    public hasCell(cell:Cell) : boolean {
        return this._cells.indexOf(cell) >= 0;
    }

    public addMoveCell(cell:Cell): boolean {
        this._stopMoving = false;

        // if (this._cells.length > 0 && (this._cells[0] == cell || this._cells[this._cells.length - 1] == cell))
            // return true;
        if (!this.hasCell(cell)) {
            // if (!cell || cell.isEmpty())
            //     return false;

            if (this._cells.length > 1) {
                const lastCell:Cell = this._cells[this._cells.length - 1];
                if (lastCell && lastCell.getLoot())
                    return false;
            }

            this._cells.push(cell);
            cell.highlight(true);
    
            cell.node.getWorldPosition(this._worldPos);
            this.updateMouseTrack(this._worldPos, true);
    
            SoundMgr.playSound('tap');
        }

        return true;
    }

    public enableMove(enable:boolean) : boolean {
        this._isMovable = enable;

        if (this.tutor)
            this.tutor.hideTrack();

        if (enable && this._state == Player.STATE.IDLE)
            return this.move2next();

        return false;
    }

    public updateMouseTrack(worldPos:Vec3, isEnd:boolean) {
        if (this.tutor)
            this.tutor.updateMouseTrack(worldPos, isEnd);
    }

    public getLevel() : number {
        if (this.levelCaption)
            return this.levelCaption.getLevel();

        return 0;
    }

    public setLevel(level:number) {
        if (this.levelCaption)
            this.levelCaption.setLevel(level, LevelCaption.TYPE.PLAYER);
    }

    protected getTargetLocalPositionFromWorldPos(worldPos:Vec3, out:Vec3) {
        this.node.getPosition(this._localPos1);
        this.node.setWorldPosition(worldPos);
        this.node.getPosition(this._localPos2);
        this.node.setPosition(this._localPos1);

        out.set(this._localPos2);
    }

    protected getTargetLocalPositionFromNode(node:Node, out:Vec3) {
        node.getWorldPosition(this._localPos2);
        this.getTargetLocalPositionFromWorldPos(this._localPos2, out);
    }

    public fall(cell:Cell, level:number, immediately:boolean) {
        this.node.active = true;

        this._cells.push(cell);

        cell.getPlayerWorldPos(this.node, this._worldPos);
        this.getTargetLocalPositionFromWorldPos(this._worldPos, this._localPos1);

        if (immediately) {
            this.node.setPosition(this._localPos1);
            GameState.setState(GameState.State.LEVEL1);
            this.rockGroup.children.forEach(element =>element.active = true);
            this.showTutor(true);
            this.onEnterFirstCell();
        } else {
            if (this.rockGroup)
                this.rockGroup.children.forEach(element => {
                    element.active = false;
                });

            this.setState(Player.STATE.FALL);

            SoundMgr.playSfx(true);
            // SoundMgr.playSound('gall_scream');

            const realHeight = this.getRealHeight();
            // const kickPos = this._localPos1.clone();
            // kickPos.y += realHeight * 3;
            // const secondPos = kickPos.clone();
            // secondPos.y += realHeight * 2;

            // const goddesSkeleton = this.goddesSkeleton;
            const player:Player = this;
            const targetPos = this._localPos1;

            // tween(goddesSkeleton.node)
            // .delay(1.6)
            // .call(()=>{
            //     if (goddesSkeleton)
            //         goddesSkeleton.setAnimation(0, 'attack3', false);
            // })
            // .start();

            // tween(this.node)
            // .to(1.5, {position:kickPos}, {easing:'expoIn', onComplete(target) {
                player.setLevel(level);
                // SoundMgr.playSound('kick');

                tween(player.node)
                // .to(0.5, {position:secondPos}, {easing:'expoIn'})
                .to(1, {position:targetPos}, {easing:'expoIn', onComplete(target) {
                    if (player.rockGroup) {
                        let dropTime = 0.3;
                        player.rockGroup.children.forEach(element => {
                            element.active = true;
                            const orgPos = element.position.clone();
                            const dropPos = orgPos.clone();
                            dropPos.y += realHeight * 10;
                            element.setPosition(dropPos);
    
                            dropTime += randomRange(0.05, 0.1);
                            tween(element)
                            .to(dropTime, {position:orgPos}, {easing:'expoIn'})
                            .start();
                            // SoundMgr.playSound('rock');
                        });
                    }
                    player.setState(Player.STATE.STANDUP);
                    GameState.setState(GameState.State.LEVEL1);
                },})
                .start();
            // },})
            // .start();
        }
    }

    public showTutor(show:boolean) {
        if (this.tutor) {
            if (show && this.canInput()) {
                if (this._cells.length == 1) {
                    if (this._noMovedYet) {
                        this._cells[0].node.getWorldPosition(this._worldPos);
                        this._worldPos.x -= 1;
                        
                        const cellContentSize = this._cells[0].getUITransform().contentSize;
                        this.tutor.showTutor(cellContentSize.width / this.node.scale.x + 40, 
                            cellContentSize.height / this.node.scale.y + 100, this._worldPos);
                    } else {
                        this._cells[0].blinkAvailCells(true, this.getLevel());
                    }
                }
            } else {
                this.tutor.hideTutor();
                if (this._cells.length > 0)
                    this._cells[0].blinkAvailCells(false, 0);
            }
        }
    }

    protected onLoad(): void {
        this._contentSize = this.getComponent(UITransform).contentSize;
        this.node.active = false;

        // this.setAllAnimationTimeScale(this.timeScale);
    }

    protected setAnimationScale(skeleton:sp.Skeleton, timeScale:number) {
        if (skeleton)
            skeleton.timeScale = timeScale;
    }

    // start() {
    //     this.bodySkeleton.setEventListener((entry, event) => {
    //         // console.log(entry, event)
    //         this.onSpineEvent(entry, event as sp.spine.Event);
    //     });
    // }

    // onSpineEvent(entry: sp.spine.TrackEntry, event: sp.spine.Event) {
    //     // console.log(`Event fired: ${event.data.name}`);
    //     // Handle the event based on the event name or data
    //     if (event && event.data) {
    //         switch (event.data.name) {
    //             case 'jump_start':
    //                 this._jumpState = Player.JUMP_STATE.START;
    //                 break;
    //             case 'jump_up':
    //                 this._jumpState = Player.JUMP_STATE.UP;
    //                 break;
    //             case 'jump_down':
    //                 this._jumpState = Player.JUMP_STATE.DOWN;
    //                 break;
    //         }
    //     }
    // }

    // update(deltaTime: number) {
    //     if (!this._moving) return;

    //     switch (this._state) {
    //         case Player.STATE.RUN:
    //             break;
    //         case Player.STATE.JUMP:
    //             if (this._jumpState == Player.JUMP_STATE.NONE)
    //                 return;
    //             break;
    //     }

    //     this._moveElapsedTime += deltaTime;
    //     const t = Math.min(this._moveElapsedTime / Player._moveTime, 1);

    //     Vec3.lerp(this.node.position, this._curMoveSourceLocalPos, this._curMoveTaretLocalPos, t);

    //     this.node.setPosition(this.node.position);

    //     if (t === 1) {
    //         this._moving = false;

    //         this.actionInCell();
    //     }
    // }

    protected setAllAnimation(name:string, loop:boolean) {
        this.getComponentsInChildren(sp.Skeleton).forEach(element => {
            if (element.node.active)
                element.setAnimation(0, name, loop);
        });
    }

    protected setAllAnimationTimeScale(scale:number) {
        this.getComponentsInChildren(sp.Skeleton).forEach(element => {
            element.timeScale = scale;
        });
    }

    protected setIdleAnimation() {
        this.setAllAnimation('idle', true);
    }

    protected onEnterFirstCell() {
        this.setAllAnimationTimeScale(this.timeScale);
        this.setState(Player.STATE.IDLE);

        if (this._cells.length == 1)
            this._cells[0].occupy();
    }

    protected setState(state:number, force:boolean = false) {
        if (this._state != state || force) {
            this._state = state;

            this.showTutor(state == Player.STATE.IDLE);

            switch (state) {
                case Player.STATE.IDLE:
                    this.setIdleAnimation();
                    break;
                case Player.STATE.FALL:
                    // SoundMgr.playSound('gall_scream');
                    this.setAllAnimation('start_no_wind', true);
                    break;
                case Player.STATE.STANDUP:
                    SoundMgr.playSound('punch');
                    this.setAllAnimation('standup', false);
                    this.scheduleOnce(()=>{
                        super_html_playable.track_gtag('introEnd');
                        this.onEnterFirstCell();
                    }, 1);
                    break;
                case Player.STATE.RUN:
                    this.setAllAnimation('run', true);
                    break;
                case Player.STATE.JUMP:
                    // this._jumpState = Player.JUMP_STATE.NONE;
                    this.setAllAnimation('jump', false);
                    break;
                case Player.STATE.ATTACK:
                    this.setAllAnimation('attack', true);
                    break;
                case Player.STATE.DEATH:
                    this.setAllAnimation('death_fear', false);
                    break;
                case Player.STATE.UPGRADE:
                    this.setAllAnimation('upgrade', false);
                    break;
                case Player.STATE.WAIT:
                    this.setIdleAnimation();
                    break;
            }
        }
    }

    protected pickUp(lootName:string) {
        switch(lootName) {
            case 'sword_angel':
            case 'sword_diabolic':
                this.weaponSkeleton.node.active = true;
                this.weaponSkeleton.setSkin(lootName);
                break;
            case 'ork2':
                this._finish = true;
                lootName = 'egypt';
            case 'champion':
            case 'angel':
                this.bodySkeleton.node.active = true;
                this.bodySkeleton.setSkin(lootName);
                break;
            case 'helm':
                this._finish = true;
                this.headSkeleton.node.active = true;
                this.headSkeleton.setSkin(lootName);
                break;
        }
    }

    protected showVfx(node:Node) {
        if (node && !node.active) {
            node.active = true;
            node.scale = Vec3.ONE;

            tween(node)
            .to(0.1, {scale:this._dropVfxScale2})
            .call(()=>{
                node.active = false;
            })
            .start();
        }
    }

    protected actionInCell() {
        const sourceCell:Cell = this._cells[0];
        const targetCell:Cell = this._cells[1];

        const monster:Monster = targetCell.getMonster();
        const loot:Loot = targetCell.getLoot();

        this._cells.shift();
    
        const player = this;
        const playerLevel = player.getLevel();
        const monsterLevel = monster?.getLevel();
        const lootLevel = loot?.getLevel();

        const newPos = Vec3.ZERO.clone();
        const newScale = player.node.scale.clone();

        if (this.avatar)
            this.avatar.setScale(Vec3.ONE);

        if (lootLevel > 0) {
            SoundMgr.playSound('room_expand');

            targetCell.highlight(false);
            targetCell.occupy();

            player.clearCellPath();
            player._cells.push(targetCell);

            player.addLevel(playerLevel * (lootLevel - 1));
            player.pickUp(loot.getName());
            player.setState(Player.STATE.UPGRADE);

            targetCell.expand2();
            targetCell.getPlayerWorldPos(player.node, newPos);
            player.node.setWorldPosition(newPos);

            newScale.multiplyScalar(2);

            GameState.setState(GameState.getState() + 1);
            
            tween(this.node)
            .to(0.5, {scale:newScale})
            .call(()=>{
                SoundMgr.playSound('happy');
                SoundMgr.playSound('level_up', false);
            })
            .delay(1)
            .call(()=>{
                player.move2next();
            })
            .start();
        } else if (monsterLevel > 0) {
            targetCell.highlight(false);
            
            if (playerLevel > monsterLevel) {
                player.setState(Player.STATE.ATTACK);
                this.scheduleOnce(()=>{
                    SoundMgr.playSound('flycatcher_shut');
                }, 0.7 / this.timeScale);
            } else {
                player.setState(Player.STATE.WAIT);
                monster.attack();
                
                this.scheduleOnce(()=>{
                    SoundMgr.playSound('flycatcher_shut');
                }, 0.3);
            }

            tween(this.node)
            .delay(playerLevel > monsterLevel ? 1 / this.timeScale : 0.5)
            .call(() => {
                if (playerLevel > monsterLevel) {
                    monster.showHitVfx();
                    monster.death();
                    player.setIdleAnimation();

                    if (player.drops){
                        monster.node.getWorldPosition(player._worldPos);

                        player.drops.children.forEach(element => {
                            player.throwAndBounceDrop(element, player._worldPos, targetCell.getCellSize());
                        });

                        player.scheduleOnce(()=>{
                            SoundMgr.playSound('points_sphere');
                            player.showVfx(player.dropsVfx);

                            player.addLevel(monsterLevel);

                            tween(this.subAvatar)
                            .to(0.05, {scale:this._dropVfxScale})
                            .to(0.05, {scale:Vec3.ONE})
                            .start();
                        }, 0.6);
                    }

                    targetCell.scheduleOnce(()=>{
                        targetCell.occupy();
                    }, 0.5);

                    SoundMgr.playSound('death_mob');
                } else {
                    monster.idle();
                    player.showVfx(player.hitVfx);
                    player.setState(Player.STATE.DEATH);

                    SoundMgr.playSound('gall_death_short');
                }
            })
            .delay(0.5)
            .call(() => {
                if (playerLevel <= monsterLevel) {
                    player.scheduleOnce(()=>{
                        player.clearCellPath();
                        player._cells.push(sourceCell);

                        targetCell.recoverWall(true);
                        // targetCell.recoverWall(false);

                        sourceCell.getPlayerWorldPos(player.node, this._worldPos);
                        player.node.setWorldPosition(this._worldPos);

                        player.setGameStateByCell(sourceCell);

                        if (player.retryScreen) {
                            super_html_playable.track_gtag('retry');

                            player.retryScreen.active = true;
                            if (player.retryIcon)
                                tween(player.retryIcon)
                                .by(0.7, {angle:360}, {easing:'expoOut'})
                                .start();
                            player.scheduleOnce(() => {
                                player.retryScreen.active = false;
                            }, 0.7);
                        }

                        player.move2next();
                    }, 0.2);
                } else
                    player.move2next();
            })
            .start();
        } else {
            targetCell.highlight(false);
            player.move2next();
        }
    }

    protected setGameStateByCell(cell:Cell) {
        if (cell) {
            GameState.setState(cell.getGameState());
        }
    }

    protected move2next() : boolean {
        let ret:boolean = false;
        if (this._cells.length > 1) {
            const sourceCell:Cell = this._cells[0];
            const targetCell:Cell = this._cells[1];

            if (this._stopMoving) {
                this.clearCellPath();
                this._cells.push(sourceCell);

                this._stopMoving = false;
                this.setState(Player.STATE.IDLE);
                return false;
            }

            ret = true;
            
            this._noMovedYet = false;

            // const monster:Monster = targetCell.getMonster();
            // const loot:Loot = targetCell.getLoot();

            // this._cells.shift();

            this.node.getWorldPosition(this._worldPos);
            targetCell.getPlayerWorldPos(this.node, this._worldPos2);

            if (this.avatar && this._worldPos.x > this._worldPos2.x + EPSILON)
                this.avatar.setScale(this._invertScale);
    
            this.node.getPosition(this._curMoveSourceLocalPos);
            this.getTargetLocalPositionFromWorldPos(this._worldPos2, this._curMoveTaretLocalPos);

            // this._moving = true;
            // this._moveElapsedTime = 0;
            this.setGameStateByCell(targetCell);

            const isJump : boolean = Math.abs(this._worldPos.y - this._worldPos2.y) > EPSILON;

            if (isJump) {
                this.setState(Player.STATE.JUMP, true);// for animation, true

                const topPos:Vec3 = Vec3.ZERO.clone();
                const cellSize = sourceCell.getUITransform().contentSize;
                topPos.x = (this._curMoveSourceLocalPos.x + this._curMoveTaretLocalPos.x) / 2;
                if (this._curMoveTaretLocalPos.y > this._curMoveSourceLocalPos.y)
                    topPos.y = this._curMoveTaretLocalPos.y + cellSize.height / 3;
                else
                    topPos.y = this._curMoveSourceLocalPos.y + cellSize.height / 3;

                tween(this.node)
                .delay(0.3 / this.timeScale)
                .to(0.2 / this.timeScale, {position:topPos}, {easing:'quadOut'})
                .to(0.23 / this.timeScale, {position:this._curMoveTaretLocalPos}, {easing:'quadOut'})
                // .delay(0.3)
                .call(()=>{
                    this.actionInCell();
                })
                .start();
            } else {
                this.setState(Player.STATE.RUN);

                if (Math.abs(Math.abs(targetCell.node.position.x - sourceCell.node.position.x) - (sourceCell.getUITransform().width + targetCell.getUITransform().width) / 2) < EPSILON) {
                    this.scheduleOnce(()=>{
                        const cell = targetCell.node.position.x > sourceCell.node.position.x ? targetCell : sourceCell;
                        if (cell.removeWall(true)) {
                            SoundMgr.playSound('room_clearing');
                            if (this.ruinEffect) {
                                cell.node.getWorldPosition(this._worldPos);
                                this._worldPos.x -= cell.getUITransform().width / 2;
                                const vfx = instantiate(this.ruinEffect);
                                this.node.parent.addChild(vfx);
                                vfx.setWorldPosition(this._worldPos);
                                const scale = vfx.getScale();
                                scale.multiplyScalar(cell.getCellSize());
                                vfx.setScale(scale);
                                this.scheduleOnce(()=>{
                                    vfx.destroy();
                                }, 0.5);
                            }
                        }
                    }, Player._moveTime / 2);
                }

                tween(this.node)
                .to(Player._moveTime, {position:this._curMoveTaretLocalPos})
                .call(()=>{
                    this.actionInCell();
                })
                .start();
            }
        } else {
            this.setState(Player.STATE.IDLE);
        }

        return ret;
    }

    protected throwAndBounceDrop(dropNode:Node, originWorldPos:Vec3, scale:number) {
        const position = originWorldPos.clone();

        const unit = scale * 7;
        position.y += unit;
        dropNode.active = true;
        dropNode.setWorldPosition(position);
        
        position.x += randomRange(0, unit * 1.5);
        position.y = originWorldPos.y;

        tween(dropNode)
            .delay(randomRange(0, 0.2))
            .to(randomRange(0.3, 0.4), { worldPosition: position }, { easing: 'bounceOut' })  // Fall with gravity
            .to(0.2, { position: Vec3.ZERO })  // Return to the original position
            .call(()=>{
                dropNode.active = false;
            })
            .start();
    }

    protected clearCellPath() {
        if (this._cells) {
            while(true) {
                const cell = this._cells.pop();
                if (cell)
                    cell.highlight(false);
                else
                    break;
            }

        }
    }

    public addLevel(value : number) {
        if (this.levelCaption)
            return this.levelCaption.addLevel(value);

        return 0;
    }
}



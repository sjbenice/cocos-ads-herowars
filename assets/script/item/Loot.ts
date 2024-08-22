import { _decorator, Color, Component, Node, randomRange, Sprite, SpriteFrame, Tween, tween, Vec3 } from 'cc';
import { LevelCaption } from './LevelCaption';
const { ccclass, property } = _decorator;

@ccclass('Loot')
export class Loot extends Component {
    @property(SpriteFrame)
    spriteFrames:SpriteFrame[] = [];

    @property(LevelCaption)
    level:LevelCaption = null;

    @property(Sprite)
    lootSprite:Sprite = null;

    @property(Node)
    vfx:Node = null;

    protected static _levelHighlightZoom:number = 1.5;
    protected _levelOrgScale : Vec3;
    protected _levelHighlightScale : Vec3;
    protected _vfxColor:Color = Color.WHITE.clone();

    public setup(type:number, level:number):boolean {
        if (this.lootSprite && type >= 0 && type < this.spriteFrames.length) {
            this.lootSprite.spriteFrame = this.spriteFrames[type];

            if (this.level)
                this.level.setLevel(level, LevelCaption.TYPE.LOOT);

            return true;
        }

        return false;
    }

    public getName() : string {
        if (this.lootSprite)
            return this.lootSprite.spriteFrame.name;

        return null;
    }

    public getLevel() {
        if (this.node.active && this.level)
            return this.level.getLevel();
    }
    
    public highlight(color:Color) {
        if (this.level) {
            this.level.setBgColor(color);

            tween(this.level.node)
            .to(0.2, {scale:(color==null?this._levelOrgScale:this._levelHighlightScale)}, {easing:'cubicOut'})
            .start();
        }
    }

    public hideEffect(time:number) {
        this.level.node.active = false;

        const lootSprite = this.lootSprite;
        const color = this._vfxColor;

        tween(this.node)
        .to(0.5, {position:this.node.position}, {onUpdate(target, ratio) {
            if (lootSprite) {
                color.a = (1 - ratio) * 255;
                lootSprite.color = color;
            }
        },})
        .call(()=>{
            lootSprite.color = Color.WHITE;
            this.level.node.active = true;
            this.node.active = false;
        })
        .start();
    }

    start() {
        if (this.vfx)
            tween(this.vfx).by(randomRange(3, 4), {angle:360}).repeatForever().start();

        if (this.level) {
            this._levelOrgScale = this.level.node.scale.clone();
            this._levelHighlightScale = this._levelOrgScale.clone();
            this._levelHighlightScale.multiplyScalar(Loot._levelHighlightZoom);
        }
    }

    protected onDestroy(): void {
        if (this.vfx)
            Tween.stopAllByTarget(this.vfx);
    }
    // update(deltaTime: number) {
    // }
}



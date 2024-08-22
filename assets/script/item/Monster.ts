import { _decorator, Color, Component, math, Node, sp, tween, v3, Vec3 } from 'cc';
import { LevelCaption } from './LevelCaption';
const { ccclass, property } = _decorator;

@ccclass('Monster')
export class Monster extends Component {
    @property(LevelCaption)
    level:LevelCaption = null;

    @property(sp.Skeleton)
    skeletons:sp.Skeleton[] = [];

    @property(Node)
    hitVfx:Node = null;

    protected static _anims:string[] = ['idle', 'attack', 'damage', 'death'];
    public static Anim = {
        IDLE:0,
        ATTACK:1,
        DAMAGE:2,
        DEATH:3,
    };

    protected static _levelHighlightZoom:number = 1.5;
    protected _levelOrgScale : Vec3;
    protected _levelHighlightScale : Vec3;
    protected _vfxColor:Color = Color.WHITE.clone();
    protected _dropVfxScale2:Vec3 = v3(6, 6, 1);

    start() {
        // this.scheduleOnce(()=>{
            // this.idle();
        // }, math.randomRange(0.1, 2));

        if (this.level) {
            this._levelOrgScale = this.level.node.scale.clone();
            this._levelHighlightScale = this._levelOrgScale.clone();
            this._levelHighlightScale.multiplyScalar(Monster._levelHighlightZoom);
        }
    }

    public getLevel() : number {
        if (this.node.active && this.level)
            return this.level.getLevel();
        return 0;
    }

    public setLevel(level:number) : boolean {
        if (this.level) {
            this.level.setLevel(level, LevelCaption.TYPE.ENEMY);
            return true;
        }

        return false;
    }

    public highlight(color:Color) {
        if (this.level) {
            this.level.setBgColor(color);

            tween(this.level.node)
            .to(0.2, {scale:(color==null?this._levelOrgScale:this._levelHighlightScale)}, {easing:'cubicOut'})
            .start();
        }
    }

    public idle() {
        this.setAnimation(Monster._anims[Monster.Anim.IDLE], true);
    }

    public attack() {
        this.setAnimation(Monster._anims[Monster.Anim.ATTACK], true);
    }

    public death() {
        this.setAnimation(Monster._anims[Monster.Anim.DEATH], false);
    }

    protected setAnimation(name:string, loop:boolean) {
        this.skeletons.forEach(element => {
            element.setAnimation(0, name, loop);
        });
    }

    public hideEffect(time:number) {
        this.level.node.active = false;

        const skeletons = this.skeletons;
        const color = this._vfxColor;

        tween(this.node)
        .to(0.5, {position:this.node.position}, {onUpdate(target, ratio) {
            color.a = (1 - ratio) * 255;
            skeletons.forEach(element => {
                element.color = color;
            });
        },})
        .call(()=>{
            skeletons.forEach(element => {
                element.color = Color.WHITE;
            });

            this.level.node.active = true;
            this.node.active = false;
        })
        .start();
    }

    public showHitVfx() {
        if (this.hitVfx && !this.hitVfx.active) {
            this.hitVfx.active = true;
            this.hitVfx.scale = Vec3.ONE;

            tween(this.hitVfx)
            .to(0.1, {scale:this._dropVfxScale2})
            .call(()=>{
                this.hitVfx.active = false;
            })
            .start();
        }
    }
    // update(deltaTime: number) {
    // }
}


